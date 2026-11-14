const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/user.models");
const AuthToken = require("../models/authtoken.models");
const Bookmark = require("../models/bookmark.models");
const ExamAttempt = require("../models/examattempt.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const Mastery = require("../models/mastery.models");
const Mistake = require("../models/mistake.models");
const Note = require("../models/note.models");
const Notification = require("../models/notification.models");
const Report = require("../models/report.models");
const Position = require("../models/position.models");
const Progress = require("../models/progress.models");
const StudyTime = require("../models/studytime.models");
const TestResult = require("../models/testresult.models");
const hashPassword = require("../utils/bcrypt");
const authCache = require("../utils/authCache");
const sendEmail = require("../utils/sendEmail");
const { issueToken, consumeRow } = require("../utils/authTokens");
const { cookieOptions } = require("./auth.controller");

// Everything Catalyst keeps about the student, as one JSON file. It holds the student's own data only:
// never the password hash, and never correct answers or explanations (grading data stays on the server).
const exportData = async (req, res, next) => {
  try {
    const user = req.user.id;
    const own = (Model, select) => Model.find({ user }).select(`-_id -user -__v ${select || ""}`).lean();
    const [profile, progress, testResults, mistakes, flashcards, mastery, notes, bookmarks, positions, studyTime, examAttempts, reports] = await Promise.all([
      User.findById(user).select("name email role avatar emailVerified onboarded examDate dailyGoal subscriptionEndsAt createdAt -_id").lean(),
      own(Progress),
      own(TestResult),
      own(Mistake, "-fsrs"),
      own(FlashcardProgress, "-fsrs"),
      own(Mastery),
      own(Note),
      own(Bookmark),
      own(Position),
      own(StudyTime),
      // The marked result of an exam holds correct answers, so it is left out. The student's own answers stay.
      own(ExamAttempt, "-result"),
      own(Report, "-test -target -link -resolvedBy")
    ]);
    if (!profile) return res.status(404).json({ message: "User not found" });
    res.setHeader("Content-Disposition", 'attachment; filename="catalyst-my-data.json"');
    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      profile, progress, testResults, mistakes, flashcards, mastery, notes, bookmarks, positions, studyTime, examAttempts, reports
    });
  } catch (error) {
    next(error);
  }
};

// Permanent. Personal data is removed and the account can never be opened again.
// The account row stays, renamed and with a dead password, so the anonymous progress and mistake counts
// that other features read keep working. Notes, bookmarks, positions, study time and exam answers are deleted.
const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user || user.deletedAt) return res.status(404).json({ message: "User not found" });
    if (!(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ message: "Your password is not correct" });
    }
    if (user.role === "admin") {
      const others = await User.countDocuments({ role: "admin", isActive: { $ne: false }, deletedAt: null, _id: { $ne: user._id } });
      if (others === 0) return res.status(409).json({ message: "You are the only admin. Make another admin before deleting this account." });
    }

    const id = user._id;
    const deadPassword = await hashPassword(crypto.randomBytes(32).toString("hex"));
    if (!deadPassword) return res.status(500).json({ message: "Error deleting account" });

    // Account first: once it is inactive the student is locked out, so a failure later only leaves harmless leftovers.
    await User.updateOne({ _id: id }, {
      $set: {
        name: "Deleted user",
        email: `deleted-${id}@deleted.invalid`,
        password: deadPassword,
        avatar: null,
        examDate: null,
        enrolledCourses: [],
        isActive: false,
        deletedAt: new Date(),
        passwordChangedAt: new Date()
      }
    });
    authCache.forget(id);
    await Promise.all([
      Note.deleteMany({ user: id }),
      Bookmark.deleteMany({ user: id }),
      Position.deleteMany({ user: id }),
      StudyTime.deleteMany({ user: id }),
      ExamAttempt.deleteMany({ user: id }),
      Notification.deleteMany({ user: id }),
      Report.deleteMany({ user: id }),
      AuthToken.deleteMany({ user: id })
    ]);

    res.clearCookie("token", cookieOptions);
    return res.status(200).json({ message: "Your account was deleted." });
  } catch (error) {
    next(error);
  }
};

// Step 1 of changing email. The password is checked, then a link goes to the NEW address.
// The email on the account changes only when that link is opened, so a typo cannot lock the student out.
// The old address gets a warning, so a thief with a borrowed session cannot switch it silently.
const requestEmailChange = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password name email");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ message: "Your password is not correct" });
    }
    const newEmail = req.body.email;
    if (newEmail === user.email) return res.status(400).json({ message: "That is already your email" });
    if (await User.exists({ email: newEmail })) return res.status(409).json({ message: "An account with this email already exists" });
    const token = await issueToken(user._id, "email", { newEmail });
    await sendEmail({
      to: newEmail,
      subject: "Confirm your new Catalyst email",
      text: `Hi ${user.name},\n\nOpen this link to use this address for Catalyst (valid for 1 hour):\n${process.env.CLIENT_URL}/confirm-email?token=${token}\n\nIf you did not ask for this, ignore this email.\n`
    });
    sendEmail({
      to: user.email,
      subject: "Catalyst email change requested",
      text: `Hi ${user.name},\n\nSomeone asked to change the email on your Catalyst account to ${newEmail}. Nothing changes until that address confirms. If this was not you, change your password now.\n`
    }).catch((err) => console.error("Email-change warning failed:", err.message));
    return res.status(200).json({ message: "We sent a link to the new address. Your email changes when you open it." });
  } catch (error) {
    next(error);
  }
};

// Step 2. Public, because the link may be opened on another device. The link is the proof.
const confirmEmailChange = async (req, res, next) => {
  try {
    const row = await consumeRow(req.body.token, "email");
    if (!row || !row.newEmail) return res.status(400).json({ message: "This link is invalid or has expired. Ask for a new one." });
    try {
      const done = await User.updateOne({ _id: row.user, deletedAt: null }, { $set: { email: row.newEmail, emailVerified: true } });
      if (!done.matchedCount) return res.status(400).json({ message: "This link is invalid or has expired. Ask for a new one." });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists" });
      throw error;
    }
    return res.status(200).json({ message: "Email changed.", data: { email: row.newEmail } });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportData, deleteAccount, requestEmailChange, confirmEmailChange };
