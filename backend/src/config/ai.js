// The AI models Catalyst may use, as a LIST. Exactly one is the default. A model picker (and a paid model) can be
// added later by adding rows here: nothing else in the app names a model.
//
//   id             short name used inside Catalyst and by a future picker
//   provider       "cloudflare" (Workers AI) or "fake" (tests, never calls the network)
//   model          the provider's own model name
//   label          what a student would see
//   maxInputChars  the most text (all messages together) one request may send
//   maxOutputTokens the most the model may write back (a hard cap on every answer)
//   timeoutMs      give up after this long
//
// Free beta: one model with low limits. Keys live in .env only (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN).
const MODELS = [
  {
    id: "llama-3.1-8b",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B (free)",
    maxInputChars: 12000,
    maxOutputTokens: 600,
    timeoutMs: 20000,
    default: true
  },
  {
    id: "fake",
    provider: "fake",
    model: "fake",
    label: "Test model",
    maxInputChars: 12000,
    maxOutputTokens: 600,
    timeoutMs: 1000,
    default: false
  }
];

// Which model is used when the caller names none. AI_MODEL in .env can pick another id from the list above.
// AI_PROVIDER=fake switches to the test model without touching any code.
const defaultModel = () => {
  if (process.env.AI_PROVIDER === "fake") return MODELS.find((item) => item.id === "fake");
  const wanted = process.env.AI_MODEL && MODELS.find((item) => item.id === process.env.AI_MODEL && item.provider !== "fake");
  return wanted || MODELS.find((item) => item.default);
};

const findModel = (id) => MODELS.find((item) => item.id === id) || null;

module.exports = { MODELS, defaultModel, findModel };
