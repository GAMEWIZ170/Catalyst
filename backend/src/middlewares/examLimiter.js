const { rateLimit } = require("express-rate-limit");

// Mock exams save answers as the student goes, so this is much higher than the answer limiter.
const examLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600, // per student, per 15 minutes
  keyGenerator: (req) => req.user.id, // count by logged-in user, not IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many exam requests. Please wait a few minutes." }
});

module.exports = examLimiter;
