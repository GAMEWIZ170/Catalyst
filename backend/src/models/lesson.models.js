// lesson.models.js
const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    explanation: { type: String, required: true },
    explanationImage: {
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
        alt: { type: String, trim: true, maxlength: 200 },
        width: Number,
        height: Number
    },
    videoHost: { type: String, default: "", trim: true },
    videoId: { type: String, default: "", trim: true },
    isPublished: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

lessonSchema.index({ title: "text", explanation: "text" }, { weights: { title: 5, explanation: 1 }, name: "lesson_search" }); // student search
lessonSchema.index({ unit: 1, order: 1 }); // the lessons of some units, in order

module.exports = mongoose.model("Lesson", lessonSchema);