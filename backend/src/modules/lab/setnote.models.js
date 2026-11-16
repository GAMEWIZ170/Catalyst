const mongoose = require("mongoose");

// The notes of one study set, as a Tiptap document (JSON). One per set. Saved as the student types.
const setNoteSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true, unique: true },
  content: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true, minimize: false });

module.exports = mongoose.model("SetNote", setNoteSchema);
