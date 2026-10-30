// course.models.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true },
    // CHANGED: trim added, so stray spaces never get saved
    title: { type: String, required: true, trim: true },
    // CHANGED: trim added, plus maxlength 200 as a second lock behind the
    // Joi validator (Joi guards the door, the model guards the database)
    description: { type: String, required: true, trim: true, maxlength: 200 },
    isPublished: { type: Boolean, default: false },
    // CHANGED: soft delete. null means "not deleted"; a date means "deleted then"
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

courseSchema.index({ title: "text" });

module.exports = mongoose.model("Course", courseSchema);