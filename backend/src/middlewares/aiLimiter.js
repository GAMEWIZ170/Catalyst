// aiLimiter.js: "make drafts with AI". A short-term brake per student while the free model has low limits.
// The daily quotas and the global cap come with Phase X6.4.
const { rateLimit } = require("express-rate-limit");

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "You have asked for several drafts. Please wait a few minutes and try again." }
});

module.exports = aiLimiter;
