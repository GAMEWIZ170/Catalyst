const mongoose = require("mongoose");

// Where a student last was in a course, so Home can offer "Continue". One record per student per course.
const positionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    kind: { type: String, enum: ["lesson", "flashcards"], default: "lesson" },
    position: { type: Number, min: 0, default: 0 }, // card number, for flashcards
    total: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

positionSchema.index({ user: 1, course: 1 }, { unique: true });
positionSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Position", positionSchema);
