const mongoose = require("mongoose");

// One row per emailed link (password reset or email verification).
// Only the SHA-256 hash is stored, so a database leak does not hand out working links.
// Mongo deletes the row by itself after expiresAt (TTL index), and a used token is deleted at once.
const authTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["reset", "verify"], required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authTokenSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model("AuthToken", authTokenSchema);
