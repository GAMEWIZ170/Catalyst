const mongoose = require("mongoose");

// One student studied one shared set on one UTC day (someone other than the owner). One row per student, set and day,
// so opening it ten times counts once. It feeds "times studied", the owner's XP and the weekly and monthly boards.
const setStudySchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // the set's owner, kept so creator boards need no join
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true }
}, { versionKey: false });

setStudySchema.index({ set: 1, user: 1, day: 1 }, { unique: true });
setStudySchema.index({ day: 1, set: 1 });
setStudySchema.index({ day: 1, owner: 1 });

module.exports = mongoose.model("SetStudy", setStudySchema);
