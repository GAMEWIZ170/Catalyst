// src/routes/auth.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { validateRegister, validateLogin } = require("../middleware/validate");
const { register, login, logout, getMe } = require("../controllers/auth.controller");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

module.exports = router;