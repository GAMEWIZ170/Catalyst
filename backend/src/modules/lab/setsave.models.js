const mongoose = require("mongoose");

// A student saved someone else's shared set to find it again. Saving shares nothing and copies nothing.
const setSaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true }
}, { timestamps: true, versionKey: false });

setSaveSchema.index({ user: 1, set: 1 }, { unique: true });
setSaveSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SetSave", setSaveSchema);
