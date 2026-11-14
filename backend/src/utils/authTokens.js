const crypto = require("crypto");
const AuthToken = require("../models/authtoken.models");

// Reset links live 30 minutes, verification links 24 hours (a student may open the mail later), email-change links 1 hour.
const LIFETIME_MS = { reset: 30 * 60 * 1000, verify: 24 * 60 * 60 * 1000, email: 60 * 60 * 1000 };

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Makes a new token, removes the user's older ones of that type, and returns the plain token.
// The plain token goes only into the email. It is never stored.
const issueToken = async (userId, type, extra = {}) => {
  const token = crypto.randomBytes(32).toString("hex");
  await AuthToken.deleteMany({ user: userId, type });
  await AuthToken.create({ user: userId, type, tokenHash: hash(token), ...extra, expiresAt: new Date(Date.now() + LIFETIME_MS[type]) });
  return token;
};

// Finds and deletes the token in one step, so it works once. Returns the user id, or null.
const consumeRow = (token, type) =>
  AuthToken.findOneAndDelete({ tokenHash: hash(token), type, expiresAt: { $gt: new Date() } }).lean();

const consumeToken = async (token, type) => {
  const row = await consumeRow(token, type);
  return row ? row.user : null;
};

module.exports = { issueToken, consumeToken, consumeRow };
