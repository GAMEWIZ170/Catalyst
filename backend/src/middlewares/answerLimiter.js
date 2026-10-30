// src/middlewares/answerLimiter.js
const { rateLimit } = require("express-rate-limit");

const answerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100, // per student, per 15 minutes
  keyGenerator: (req) => req.user.id, // count by logged-in user, not IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You are answering too fast. Please slow down." }
});

module.exports = answerLimiter;