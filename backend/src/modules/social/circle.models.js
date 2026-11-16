const mongoose = require("mongoose");

// A study circle: 2 to 6 friends who share one weekly goal. It is co-operative: the circle has one combined bar
// and nobody is ranked. A member is "invited" until they accept, then "joined".
const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["invited", "joined"], default: "invited" }
}, { _id: false });

const circleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  goalDays: { type: Number, min: 1, max: 6, default: 4 }, // study days per member per week (so every week has rest days)
  members: { type: [memberSchema], default: [] }
}, { timestamps: true });

circleSchema.index({ "members.user": 1, updatedAt: -1 });

module.exports = mongoose.model("StudyCircle", circleSchema);
