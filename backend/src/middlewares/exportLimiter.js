// exportLimiter.js: "download my data" reads a lot of collections, so it is limited per student.
const { rateLimit } = require("express-rate-limit");

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You can download your data 3 times every 15 minutes. Please try again later." }
});

module.exports = exportLimiter;
