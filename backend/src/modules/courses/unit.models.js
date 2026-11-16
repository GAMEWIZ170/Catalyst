// unit.models.js
const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

unitSchema.index({ title: "text" });
unitSchema.index({ course: 1, deletedAt: 1, order: 1 }); // a course's units, in order

module.exports = mongoose.model("Unit", unitSchema);