const { rateLimit } = require("express-rate-limit");

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You are submitting too fast. Please slow down." }
});

module.exports = submitLimiter;
