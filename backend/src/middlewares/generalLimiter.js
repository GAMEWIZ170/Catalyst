// generalLimiter.js: a safety net against floods.
// Signed-in students are counted one by one, so a whole campus sharing one IP address
// cannot block each other. A much higher per-IP ceiling still stops anonymous floods.
const express = require("express");
const jwt = require("jsonwebtoken");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const number = (name, fallback) => {
  const value = parseInt(process.env[name], 10);
  return value > 0 ? value : fallback;
};

const common = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." }
};

// The student id from the login cookie, or null when there is no valid one.
const userIdFrom = (req) => {
  const token = req.cookies && req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id || null;
  } catch {
    return null;
  }
};

const perIp = rateLimit({
  ...common,
  identifier: "ip",
  limit: () => number("RATE_LIMIT_IP", 5000),
  keyGenerator: (req) => ipKeyGenerator(req.ip)
});

const perUser = rateLimit({
  ...common,
  identifier: "user",
  limit: () => number("RATE_LIMIT_USER", 600),
  skip: (req) => !userIdFrom(req),
  keyGenerator: (req) => `user:${userIdFrom(req)}`
});

const generalLimiter = express.Router();
generalLimiter.use(perIp, perUser);

module.exports = generalLimiter;
