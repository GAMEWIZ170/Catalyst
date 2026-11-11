// strictLimiter.js: for login and register. Only failed attempts count.
// One account is limited per IP and email, so one student's typos do not lock out
// everyone on the same network. A higher per-IP limit still stops password guessing across many emails.
const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const number = (name, fallback) => {
  const value = parseInt(process.env[name], 10);
  return value > 0 ? value : fallback;
};

const common = {
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." }
};

const emailOf = (req) => String((req.body && req.body.email) || "").trim().toLowerCase();

const perAccount = rateLimit({
  ...common,
  identifier: "auth-account",
  limit: () => number("RATE_LIMIT_AUTH_FAILS", 20),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${emailOf(req)}`
});

const perIp = rateLimit({
  ...common,
  identifier: "auth-ip",
  limit: () => number("RATE_LIMIT_AUTH_IP", 200),
  keyGenerator: (req) => ipKeyGenerator(req.ip)
});

const strictLimiter = express.Router();
strictLimiter.use(perIp, perAccount);

module.exports = strictLimiter;
