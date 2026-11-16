const mongoose = require("mongoose");

// A lesson or a question the student saved. "target" is the lesson id or the question id, depending on kind.
const bookmarkSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["lesson", "question"], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });

bookmarkSchema.index({ user: 1, kind: 1, target: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
