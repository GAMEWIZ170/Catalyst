// course.models.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    // Null means "General". Authors show on the course card and page.
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Author" }],
    // Free courses stay open to every signed-in student, even without a subscription.
    isFree: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

courseSchema.index({ title: "text" });
courseSchema.index({ isPublished: 1, deletedAt: 1, code: 1 }); // the student course list

module.exports = mongoose.model("Course", courseSchema);