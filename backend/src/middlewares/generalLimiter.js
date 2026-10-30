// generalLimiter.js: a safety net against floods, not a per-student limit
const { rateLimit } = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000, // CHANGED: was 100; many students may share one IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." }
});

module.exports = generalLimiter;