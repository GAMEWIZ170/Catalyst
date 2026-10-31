const { rateLimit } = require("express-rate-limit");

const markDoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You are marking lessons too fast. Please slow down." }
});

module.exports = markDoneLimiter;
