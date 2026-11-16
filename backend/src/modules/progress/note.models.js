const mongoose = require("mongoose");

// A student's private note on a lesson. One per student per lesson. Never shown to anyone else.
const noteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

noteSchema.index({ user: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model("Note", noteSchema);
