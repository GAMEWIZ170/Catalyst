// src/routes/auth.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const strictLimiter = require("../middlewares/strictLimiter");
const { validateRegister, validateLogin } = require("../middlewares/validate");
const { register, login, logout, getMe } = require("../controllers/auth.controller");

router.post("/register", strictLimiter, validateRegister, register);
router.post("/login", strictLimiter, validateLogin, login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

module.exports = router;