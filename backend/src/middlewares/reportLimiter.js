// reportLimiter.js: "report a problem". Per student, so one student cannot fill the admin inbox.
const { rateLimit } = require("express-rate-limit");

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You have sent several reports. Please try again later." }
});

module.exports = reportLimiter;
