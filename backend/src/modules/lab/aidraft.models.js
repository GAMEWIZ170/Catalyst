const mongoose = require("mongoose");

// A saved AI draft (flashcards, quiz questions or notes) for one piece of text, so asking again for the same text
// costs no AI at all. The key is the student, the kind and a hash of the exact text, so it follows the document:
// edit the text and a new draft is made. Private to the student. Removed after 30 days.
const aiDraftSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["cards", "questions", "notes"], required: true },
  hash: { type: String, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  model: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

aiDraftSchema.index({ owner: 1, kind: 1, hash: 1 }, { unique: true });
aiDraftSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("AiDraft", aiDraftSchema);
