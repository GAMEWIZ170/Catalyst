const mongoose = require("mongoose");

// Who is in the Study Hall right now. One row per student, refreshed by a heartbeat every 30 seconds.
const hallPresenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  goal: { type: String, default: "", trim: true, maxlength: 80 },
  lastSeen: { type: Date, default: Date.now }
});

// Rows tidy themselves up an hour after the last heartbeat.
hallPresenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 60 * 60 });

module.exports = mongoose.model("HallPresence", hallPresenceSchema);
