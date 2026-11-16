const mongoose = require("mongoose");

// A unit inside a student's study set: a named group of lessons, in order. Light on purpose: it has none of the
// publishing or version rules an admin course unit has. A deleted unit hides its lessons and its quiz.
const setUnitSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  order: { type: Number, required: true, min: 1 },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

setUnitSchema.index({ set: 1, order: 1 });

module.exports = mongoose.model("SetUnit", setUnitSchema);
