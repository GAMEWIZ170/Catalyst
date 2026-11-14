// accountLimiter.js: for change password and delete account. Both check the password, so only failed attempts count.
const { rateLimit } = require("express-rate-limit");

const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." }
});

module.exports = accountLimiter;
