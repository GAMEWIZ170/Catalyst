const mongoose = require("mongoose");

// Source material a student attached to a study set, to be used for AI generation later (Phase X6).
// Private: only the owner's routes read it. A PDF is kept in a private Cloudinary folder (no public link) and its text
// is extracted once, at upload, and stored here. Pasted text is stored the same way, with no file.
const setMaterialSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["pdf", "text"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  text: { type: String, default: "" },
  bytes: { type: Number, default: 0 },         // size of the uploaded file (0 for pasted text)
  pages: { type: Number, default: 0 },
  publicId: { type: String, default: "" }      // the private Cloudinary asset, for PDFs
}, { timestamps: true });

setMaterialSchema.index({ set: 1, createdAt: -1 });
setMaterialSchema.index({ owner: 1 });

module.exports = mongoose.model("SetMaterial", setMaterialSchema);
