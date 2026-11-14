const mongoose = require("mongoose");

// Seconds a student spent studying on one day, for the "minutes" daily goal. One record per student per day.
const studyTimeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true }, // UTC day, as "2026-11-14"
    seconds: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

studyTimeSchema.index({ user: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("StudyTime", studyTimeSchema);
