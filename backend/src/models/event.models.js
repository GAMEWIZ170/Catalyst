const mongoose = require("mongoose");

// One thing a student did, kept for XP, achievements, leaderboards and the admin dashboard.
// props holds ids and small facts only (never a name, email or free text).
const TYPES = [
  "signup", "login", "lesson_opened", "lesson_completed", "question_answered", "test_submitted", "review_done",
  "flashcard_rated", "focus_session_completed", "video_started", "set_created", "set_studied", "challenge_sent", "challenge_played"
];

const eventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: TYPES, required: true },
  ts: { type: Date, default: Date.now },
  props: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { versionKey: false });

eventSchema.index({ ts: 1 });
eventSchema.index({ user: 1, ts: -1 });
eventSchema.index({ type: 1, ts: -1 });

const Event = mongoose.model("Event", eventSchema);
Event.TYPES = TYPES;

module.exports = Event;
