// lesson.models.js
const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
    title: { type: String, required: true, trim: true }, // CHANGED: trim
    order: { type: Number, required: true },
    explanation: { type: String, required: true },
    videoHost: { type: String, default: "", trim: true }, // CHANGED: trim
    videoId: { type: String, default: "", trim: true },   // CHANGED: trim
    isPublished: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null } // CHANGED: soft delete
}, { timestamps: true });

lessonSchema.index({ title: "text" });

module.exports = mongoose.model("Lesson", lessonSchema);