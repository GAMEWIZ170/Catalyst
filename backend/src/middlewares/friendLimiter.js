// friendLimiter.js: sending friend requests. Per student, so friend codes cannot be guessed in bulk.
const { rateLimit } = require("express-rate-limit");

const friendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You have tried several friend codes. Please try again later." }
});

module.exports = friendLimiter;
