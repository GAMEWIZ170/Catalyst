const User = require("../models/user.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const hashPassword = require("../utils/bcrypt");
const ms = require("ms");
const { hasAccess } = require("../middlewares/requireAccess");
const { loadStreak } = require("./progress.controller");
const { issueToken, consumeToken } = require("../utils/authTokens");
const sendEmail = require("../utils/sendEmail");
const authCache = require("../utils/authCache");


const cookieOptions = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === "production", 
  sameSite: "lax" 
};


// The student's own settings, sent with the account so every screen can read them.
const preferencesOf = (user) => ({
  onboarded: user.onboarded !== false,
  emailVerified: user.emailVerified !== false,
  examDate: user.examDate || null,
  dailyGoal: { kind: user.dailyGoal?.kind || "none", minutes: user.dailyGoal?.minutes || 10 }
});

const linkTo = (path, token) => `${process.env.CLIENT_URL}${path}?token=${token}`;

const sendVerifyEmail = async (user) => {
  const token = await issueToken(user._id, "verify");
  await sendEmail({
    to: user.email,
    subject: "Verify your Catalyst email",
    text: `Hi ${user.name},\n\nOpen this link to verify your email (valid for 24 hours):\n${linkTo("/verify-email", token)}\n`
  });
};

const setAuthCookie = (user, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  res.cookie("token", token, { ...cookieOptions, maxAge: ms(process.env.JWT_EXPIRES_IN) });
};

const sendTokenResponse = (user, statusCode, res) => {
  setAuthCookie(user, res);

  res
    .status(statusCode)
    .json({
      message: statusCode === 201 ? "Account created successfully" : "Logged in successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
        , avatar: user.avatar,
        subscriptionEndsAt: user.subscriptionEndsAt || null,
        hasAccess: hasAccess(user),
        ...preferencesOf(user)
      }
    });
};


const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    const hashedPassword = await hashPassword(password);
    if (!hashedPassword) {
      return res.status(500).json({ message: "Error hashing password" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "student",
      onboarded: false,
      emailVerified: false
    });

    // A failed email must not fail the sign-up. The student can ask for another link.
    sendVerifyEmail(user).catch((err) => console.error("Verification email failed:", err.message));

    sendTokenResponse(user, 201, res);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages[0] });
    }
    next(error);
  }
};


const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide an email and password"
      });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "This account has been deactivated" });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", cookieOptions);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};


const getMe = async (req, res, next) => {
  try {
    // The streak rides along, so the top bar has it without a second request on every page load.
    const [user, streak] = await Promise.all([
      User.findById(req.user.id).select("name email role avatar subscriptionEndsAt onboarded emailVerified examDate dailyGoal"),
      loadStreak(req.user.id)
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      data: {
        id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar,
        subscriptionEndsAt: user.subscriptionEndsAt, hasAccess: hasAccess(user), streak: streak.streak, ...preferencesOf(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: req.body.avatar }, { returnDocument: "after", runValidators: true }).select("name email role avatar");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ data: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (error) {
    next(error);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const { onboarded, examDate, goalKind, goalMinutes } = req.body;
    const set = {};
    if (onboarded !== undefined) set.onboarded = onboarded;
    if (examDate !== undefined) set.examDate = examDate;
    if (goalKind !== undefined) set["dailyGoal.kind"] = goalKind;
    if (goalMinutes !== undefined) set["dailyGoal.minutes"] = goalMinutes;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: set }, { returnDocument: "after", runValidators: true }).select("onboarded examDate dailyGoal");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ data: preferencesOf(user) });
  } catch (error) {
    next(error);
  }
};

// Same answer whether or not the email has an account, so nobody can use this to find who is registered.
const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email, isActive: { $ne: false } });
    if (user) {
      const token = await issueToken(user._id, "reset");
      await sendEmail({
        to: user.email,
        subject: "Reset your Catalyst password",
        text: `Hi ${user.name},\n\nOpen this link to choose a new password (valid for 30 minutes):\n${linkTo("/reset-password", token)}\n\nIf you did not ask for this, ignore this email.\n`
      }).catch((err) => console.error("Reset email failed:", err.message));
    }
    return res.status(200).json({ message: "If that email has an account, a reset link is on its way." });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const userId = await consumeToken(req.body.token, "reset");
    if (!userId) return res.status(400).json({ message: "This reset link is invalid or has expired. Ask for a new one." });
    const hashed = await hashPassword(req.body.password);
    if (!hashed) return res.status(500).json({ message: "Error hashing password" });
    await User.updateOne({ _id: userId }, { $set: { password: hashed, passwordChangedAt: new Date() } });
    authCache.forget(userId);
    return res.status(200).json({ message: "Password changed. You can log in now." });
  } catch (error) {
    next(error);
  }
};

// The student must give the current password again, so a borrowed phone cannot change it.
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: "Your current password is not correct" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Choose a password different from the current one" });
    }
    const hashed = await hashPassword(newPassword);
    if (!hashed) return res.status(500).json({ message: "Error hashing password" });
    user.password = hashed;
    user.passwordChangedAt = new Date();
    await user.save();
    authCache.forget(user._id);
    // Other devices are logged out. This one gets a fresh cookie so the student stays in.
    setAuthCookie(user, res);
    return res.status(200).json({ message: "Password changed. Other devices were logged out." });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const userId = await consumeToken(req.body.token, "verify");
    if (!userId) return res.status(400).json({ message: "This verification link is invalid or has expired. Ask for a new one." });
    await User.updateOne({ _id: userId }, { $set: { emailVerified: true } });
    return res.status(200).json({ message: "Email verified." });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("name email emailVerified");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified !== false) return res.status(200).json({ message: "Your email is already verified." });
    await sendVerifyEmail(user);
    return res.status(200).json({ message: "Verification link sent." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cookieOptions,
  setAuthCookie,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  updatePreferences,
  register,
  login,
  logout,
  getMe,
  updateAvatar
};