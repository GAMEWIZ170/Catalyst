const mongoose = require("mongoose");

// Who wrote a course. For now only the admin creates authors. "user" stays empty until the Creators programme links one.
const imageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
  publicId: { type: String, trim: true },
  alt: { type: String, trim: true, maxlength: 200 },
  width: Number,
  height: Number
}, { _id: false });

const authorSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  bio: { type: String, default: "", trim: true, maxlength: 300 },
  avatar: { type: imageSchema, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

module.exports = mongoose.model("Author", authorSchema);
