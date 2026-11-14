const mongoose = require("mongoose");

// One in-app message for one student. "key" stops the same event from being shown twice
// (for example one "cards due" message per day, or one "new lesson" message per lesson).
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["lesson", "review"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  body: { type: String, default: "", trim: true, maxlength: 300 },
  link: { type: String, default: "" }, // a path inside the app, such as /lessons/<id>
  key: { type: String, required: true },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ user: 1, key: 1 }, { unique: true });
notificationSchema.index({ user: 1, createdAt: -1 });
// Old messages clean themselves up after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);
