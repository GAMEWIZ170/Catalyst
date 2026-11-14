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
const Position = require("../models/position.models");
const Progress = require("../models/progress.models");
const StudyTime = require("../models/studytime.models");
const TestResult = require("../models/testresult.models");
const hashPassword = require("../utils/bcrypt");
const authCache = require("../utils/authCache");
const { cookieOptions } = require("./auth.controller");

// Everything Catalyst keeps about the student, as one JSON file. It holds the student's own data only:
// never the password hash, and never correct answers or explanations (grading data stays on the server).
const exportData = async (req, res, next) => {
  try {
    const user = req.user.id;
    const own = (Model, select) => Model.find({ user }).select(`-_id -user -__v ${select || ""}`).lean();
    const [profile, progress, testResults, mistakes, flashcards, mastery, notes, bookmarks, positions, studyTime, examAttempts] = await Promise.all([
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
      own(ExamAttempt, "-result")
    ]);
    if (!profile) return res.status(404).json({ message: "User not found" });
    res.setHeader("Content-Disposition", 'attachment; filename="catalyst-my-data.json"');
    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      profile, progress, testResults, mistakes, flashcards, mastery, notes, bookmarks, positions, studyTime, examAttempts
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
      AuthToken.deleteMany({ user: id })
    ]);

    res.clearCookie("token", cookieOptions);
    return res.status(200).json({ message: "Your account was deleted." });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportData, deleteAccount };
