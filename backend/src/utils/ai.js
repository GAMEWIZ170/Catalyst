const { defaultModel, findModel } = require("../config/ai");

// The one door to AI. Everything else in Catalyst calls complete() and never talks to a provider directly, so the
// provider or model can change without touching a feature.
//
//   const { text, usage, model } = await complete({ messages: [{ role: "system", content }, { role: "user", content }] });
//
// Privacy: nothing about the student is sent unless the caller puts it in a message. scrub() removes email addresses
// and any names the caller lists, and complete() runs it on every message.
// Failures are AiError with a `code` the caller can turn into a calm message:
//   not_configured  the key is missing                 too_long   the request is over the model's input limit
//   capacity        the free daily allowance is used   timeout    the provider took too long
//   provider        any other provider failure          bad_request the messages were not valid

class AiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

const ROLES = new Set(["system", "user", "assistant"]);

// Removes email addresses, and each of `names` (words of 2 or more letters, any case). Short, plain, and cautious:
// it is a safety net, not a promise that no personal detail can ever be typed into a free text box.
const scrub = (text, names = []) => {
  let clean = String(text).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email removed]");
  for (const name of names) {
    for (const word of String(name || "").split(/\s+/)) {
      if (word.length < 2) continue;
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      clean = clean.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[name removed]");
    }
  }
  return clean;
};

const isConfigured = (model = defaultModel()) => {
  if (model.provider === "fake") return true;
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
};

// --- providers: each takes (model, messages, maxTokens, temperature, signal) and returns { text, usage } ---

const cloudflare = async (model, messages, maxTokens, temperature, signal) => {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${model.model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: maxTokens, temperature }),
    signal
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.success === false) {
    const errors = payload?.errors || [];
    // 429 is a rate limit. 4006 is Workers AI saying the daily free allowance is used up.
    if (response.status === 429 || errors.some((item) => item.code === 4006)) throw new AiError("capacity", "The free AI allowance is used up for now");
    if (response.status === 401 || response.status === 403) throw new AiError("not_configured", "The AI key was refused");
    throw new AiError("provider", `The AI provider failed (${response.status})`);
  }
  // Workers AI sometimes returns JSON the model wrote as an already-parsed object instead of a string.
  const raw = payload.result?.response;
  const text = raw && typeof raw === "object" ? JSON.stringify(raw) : raw;
  if (typeof text !== "string") throw new AiError("provider", "The AI provider sent no text");
  const usage = payload.result?.usage || {};
  return { text, usage: { inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0 } };
};

// For tests. Echoes the last user message, so a test can see what would have been sent. Never touches the network.
const fake = async (model, messages) => {
  const last = [...messages].reverse().find((message) => message.role === "user");
  return { text: `FAKE: ${last ? last.content : ""}`, usage: { inputTokens: 1, outputTokens: 1 } };
};

const PROVIDERS = { cloudflare, fake };

// `names` are scrubbed from every message (pass the student's name if it could appear in text they typed).
// `maxTokens` can only lower the model's cap, never raise it.
const complete = async ({ messages, model: modelId, maxTokens, temperature = 0.3, names = [] }) => {
  const model = modelId ? findModel(modelId) : defaultModel();
  if (!model) throw new AiError("bad_request", "Unknown model");
  if (!Array.isArray(messages) || !messages.length || messages.some((m) => !m || !ROLES.has(m.role) || typeof m.content !== "string" || !m.content.trim())) {
    throw new AiError("bad_request", "Messages must be a list of { role, content } with text");
  }
  if (!isConfigured(model)) throw new AiError("not_configured", "AI is not set up yet");

  const clean = messages.map((message) => ({ role: message.role, content: scrub(message.content, names) }));
  if (clean.reduce((sum, message) => sum + message.content.length, 0) > model.maxInputChars) {
    throw new AiError("too_long", "That is too much text for one request");
  }
  const limit = Math.min(model.maxOutputTokens, Number.isInteger(maxTokens) && maxTokens > 0 ? maxTokens : model.maxOutputTokens);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), model.timeoutMs);
  try {
    const { text, usage } = await PROVIDERS[model.provider](model, clean, limit, temperature, controller.signal);
    return { text: text.trim(), usage, model: model.id };
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error.name === "AbortError") throw new AiError("timeout", "The AI took too long to answer");
    throw new AiError("provider", "The AI provider could not be reached");
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { complete, scrub, isConfigured, AiError };
