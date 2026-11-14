const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const strictLimiter = require("../middlewares/strictLimiter");
const { validateRegister, validateLogin, validateAvatar, validatePreferences } = require("../middlewares/validate");
const { register, login, logout, getMe, updateAvatar, updatePreferences } = require("../controllers/auth.controller");

router.post("/register", strictLimiter, validateRegister, register);
router.post("/login", strictLimiter, validateLogin, login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.put("/me/avatar", authenticate, validateAvatar, updateAvatar);
router.put("/me/preferences", authenticate, validatePreferences, updatePreferences);

module.exports = router;