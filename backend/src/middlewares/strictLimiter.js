// strictLimiter.js: for login and register
const { rateLimit } = require("express-rate-limit");

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // CHANGED: was 10
  skipSuccessfulRequests: true, // CHANGED: only failed attempts are counted
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." }
});

module.exports = strictLimiter;