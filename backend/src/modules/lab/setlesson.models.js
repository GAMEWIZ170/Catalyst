const mongoose = require("mongoose");

// A lesson inside a unit of a student's study set. `content` is the lesson's notes as a Tiptap document (JSON), the same
// format SetNote uses. null means the notes are not written yet (for example while the AI is still building the set).
// `set` is kept on the lesson so the owner check needs one lookup, not two.
const setLessonSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "SetUnit", required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  order: { type: Number, required: true, min: 1 },
  content: { type: mongoose.Schema.Types.Mixed, default: null },
  // What the AI was asked to cover, kept so a failed lesson can be tried again without a new outline. Never sent to screens.
  brief: { type: mongoose.Schema.Types.Mixed, default: null },
  deletedAt: { type: Date, default: null }
}, { timestamps: true, minimize: false });

setLessonSchema.index({ set: 1, unit: 1, order: 1 });
setLessonSchema.index({ unit: 1, order: 1 });

module.exports = mongoose.model("SetLesson", setLessonSchema);
