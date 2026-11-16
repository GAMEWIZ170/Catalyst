const SetMaterial = require("./setmaterial.models");
const SetNote = require("./setnote.models");
const AiDraft = require("./aidraft.models");
const User = require("../auth/user.models");
const { findOwnSet } = require("../../utils/ownSet");
const { AiError } = require("../../utils/ai");
const { slicePart, draftFrom, hashOf } = require("../../utils/aiDrafts");
const { logEvent } = require("../../utils/events");
const quota = require("../../utils/aiQuota");

// The plain text of a Tiptap notes document. A formula is kept as $...$ so the model can read it.
const notesToText = (node) => {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "inlineMath" || node.type === "blockMath") return `$${node.attrs?.latex || ""}$`;
  const inner = (node.content || []).map(notesToText).join(node.type === "doc" || node.type === "bulletList" || node.type === "orderedList" ? "\n" : "");
  return ["heading", "paragraph", "listItem", "blockquote", "codeBlock"].includes(node.type) ? `${inner}\n` : inner;
};

// What the student sees when the AI cannot help. Each failure has its own calm message and a fitting status.
const AI_PROBLEMS = {
  not_configured: [503, "AI is not set up yet."],
  capacity: [503, "AI is resting until tomorrow. Please try again then."],
  timeout: [504, "The AI took too long. Please try again."],
  too_long: [413, "That text is too long for one go. Pick a smaller part."],
  bad_output: [502, "The AI answer could not be used. Try again, or choose a different part of the text."],
  provider: [502, "The AI could not be reached. Please try again in a moment."],
  bad_request: [400, "That request could not be made."]
};

// STUDENT: makes DRAFT flashcards, quiz questions or notes from a material, the set's notes, or pasted text. Saves nothing.
const generate = async (req, res, next) => {
  let reserved = false;
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ message: "Study set not found" });
    const { kind, source, part } = req.body;

    let text = "";
    if (source.type === "material") {
      const material = await SetMaterial.findOne({ _id: source.id, set: set._id, owner: req.user.id }).select("text").lean();
      if (!material) return res.status(404).json({ message: "Material not found" });
      text = material.text;
    } else if (source.type === "notes") {
      const note = await SetNote.findOne({ set: set._id }).lean();
      text = notesToText(note?.content);
    } else {
      text = source.text;
    }
    if (String(text).trim().length < 40) return res.status(400).json({ message: "There is not enough text to work from yet." });

    const piece = slicePart(text, part);
    if (part >= piece.parts) return res.status(400).json({ message: "That part does not exist" });
    const hash = hashOf(kind, piece.text);

    // The same text asked for again is answered from the saved draft: no AI, no cost.
    const saved = await AiDraft.findOne({ owner: req.user.id, kind, hash }).select("result").lean();
    if (saved) return res.status(200).json({ data: { kind, drafts: saved.result, part, parts: piece.parts, cached: true } });

    // A new draft uses one of the student's daily generations (a cached one never does).
    const slot = await quota.reserve(req.user.id, "generation");
    if (!slot.ok) {
      return res.status(429).json({ message: slot.reason === "resting" ? "AI is resting until tomorrow. Please try again then." : "You have used today's AI drafts. They come back tomorrow.", code: slot.reason === "resting" ? "resting" : "daily_limit" });
    }
    reserved = true;
    const me = await User.findById(req.user.id).select("name displayName").lean();
    const out = await draftFrom(kind, piece.text, [me?.name, me?.displayName]);
    await quota.addTokens(req.user.id, out.usage);
    await AiDraft.updateOne({ owner: req.user.id, kind, hash }, { $setOnInsert: { result: out.drafts, model: out.model, createdAt: new Date() } }, { upsert: true })
      .catch((error) => { if (error.code !== 11000) throw error; }); // two tabs asked at once: the other one saved it
    logEvent(req.user.id, "ai_generated", { kind, input: out.usage.inputTokens, output: out.usage.outputTokens });
    return res.status(200).json({ data: { kind, drafts: out.drafts, part, parts: piece.parts, cached: false } });
  } catch (error) {
    if (reserved) await quota.release(req.user.id, "generation").catch(() => {});
    if (error instanceof AiError && AI_PROBLEMS[error.code]) {
      if (error.code === "capacity") await quota.markResting().catch(() => {});
      const [status, message] = AI_PROBLEMS[error.code];
      return res.status(status).json({ message, code: error.code });
    }
    next(error);
  }
};

module.exports = { generate, notesToText };
