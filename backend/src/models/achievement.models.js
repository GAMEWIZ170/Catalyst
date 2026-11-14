const mongoose = require("mongoose");

// One achievement a student has earned. The list of achievements lives in utils/achievements.js.
// seen is false until the student has been shown the small "earned" message.
const achievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true },
  seen: { type: Boolean, default: false },
  unlockedAt: { type: Date, default: Date.now }
}, { versionKey: false });

achievementSchema.index({ user: 1, key: 1 }, { unique: true });
achievementSchema.index({ user: 1, seen: 1 });

module.exports = mongoose.model("AchievementUnlock", achievementSchema);
