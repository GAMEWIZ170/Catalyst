// emailLimiter.js: for forgot password and resend verification. Every request counts, because each one sends mail.
const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const common = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many email requests. Please try again later." }
};

const emailOf = (req) => String((req.body && req.body.email) || "").trim().toLowerCase();

const perAccount = rateLimit({
  ...common,
  identifier: "email-account",
  limit: 5,
  keyGenerator: (req) => req.user ? `user:${req.user.id}` : `${ipKeyGenerator(req.ip)}|${emailOf(req)}`
});

const perIp = rateLimit({
  ...common,
  identifier: "email-ip",
  limit: 30,
  keyGenerator: (req) => ipKeyGenerator(req.ip)
});

const emailLimiter = express.Router();
emailLimiter.use(perIp, perAccount);

module.exports = emailLimiter;
