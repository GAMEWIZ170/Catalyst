// course.models.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    isPublished: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

courseSchema.index({ title: "text" });

module.exports = mongoose.model("Course", courseSchema);