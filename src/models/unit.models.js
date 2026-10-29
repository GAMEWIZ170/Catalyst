// unit.models.js
const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true }, // CHANGED: trim
    order: { type: Number, required: true },
    deletedAt: { type: Date, default: null } // CHANGED: soft delete
}, { timestamps: true });

unitSchema.index({ title: "text" });

module.exports = mongoose.model("Unit", unitSchema);