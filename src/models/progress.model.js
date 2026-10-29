// src/models/progress.models.js
const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    completed: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 100, default: 0 }, // best score so far
    completedAt: { type: Date, default: null },            // first time it was completed
    completedDays: { type: [String], default: [] }         // every day it was completed, as "2026-10-29"
}, { timestamps: true });

// One progress record per student per lesson
progressSchema.index({ user: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);