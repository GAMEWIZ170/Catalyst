const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const strictLimiter = require("../middlewares/strictLimiter");
const emailLimiter = require("../middlewares/emailLimiter");
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, validateVerifyEmail, validateAvatar, validatePreferences } = require("../middlewares/validate");
const { register, login, forgotPassword, resetPassword, verifyEmail, resendVerification, logout, getMe, updateAvatar, updatePreferences } = require("../controllers/auth.controller");

router.post("/register", strictLimiter, validateRegister, register);
router.post("/login", strictLimiter, validateLogin, login);
router.post("/forgot-password", emailLimiter, validateForgotPassword, forgotPassword);
router.post("/reset-password", strictLimiter, validateResetPassword, resetPassword);
router.post("/verify-email", strictLimiter, validateVerifyEmail, verifyEmail);
router.post("/resend-verification", authenticate, emailLimiter, resendVerification);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.put("/me/avatar", authenticate, validateAvatar, updateAvatar);
router.put("/me/preferences", authenticate, validatePreferences, updatePreferences);

module.exports = router;