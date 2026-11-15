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
const StudySet = require("../models/studyset.models");
const SetNote = require("../models/setnote.models");
const Flashcard = require("../models/flashcard.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const SetMaterial = require("../models/setmaterial.models");
const cloudinary = require("../config/cloudinary");
const ExamDate = require("../models/examdate.models");
const Friendship = require("../models/friendship.models");
const Challenge = require("../models/challenge.models");
const Circle = require("../models/circle.models");
const AiDraft = require("../models/aidraft.models");
const SetSave = require("../models/setsave.models");
const SetStudy = require("../models/setstudy.models");
const LeaderboardEntry = require("../models/leaderboard.models");
const AchievementUnlock = require("../models/achievement.models");
const XpEntry = require("../models/xp.models");
const hashPassword = require("../utils/bcrypt");
const authCache = require("../utils/authCache");
const sendEmail = require("../utils/sendEmail");
const { issueToken, consumeRow } = require("../utils/authTokens");
const { cookieOptions } = require("./auth.controller");

// A student's own study sets with their notes, cards and quizzes (the quizzes hold the answers the student wrote).
const exportStudySets = async (user) => {
  const sets = await StudySet.find({ owner: user, deletedAt: null }).select("-__v -owner").lean();
  const ids = sets.map((set) => set._id);
  const [notes, cards, tests, materials] = await Promise.all([
    SetNote.find({ set: { $in: ids } }).select("-_id -__v").lean(),
    Flashcard.find({ set: { $in: ids }, deletedAt: null }).select("set front back order -_id").lean(),
    Test.find({ set: { $in: ids }, deletedAt: null }).select("_id set title").lean(),
    SetMaterial.find({ set: { $in: ids } }).select("set kind title text pages -_id").lean()
  ]);
  const questions = await Question.find({ test: { $in: tests.map((test) => test._id) }, deletedAt: null }).select("-__v -deletedAt").lean();
  const by = (rows, key) => (id) => rows.filter((row) => String(row[key]) === String(id));
  return sets.map((set) => ({
    ...set,
    notes: by(notes, "set")(set._id)[0]?.content || null,
    cards: by(cards, "set")(set._id).map(({ front, back, order }) => ({ front, back, order })),
    materials: by(materials, "set")(set._id).map(({ kind, title, text, pages }) => ({ kind, title, text, pages })),
    quizzes: by(tests, "set")(set._id).map((test) => ({ title: test.title, questions: by(questions, "test")(test._id).map(({ _id, test: t, createdAt, updatedAt, ...rest }) => rest) }))
  }));
};

// Removes a student's study sets and everything in them for good (they are private to the student).
const deleteStudySets = async (user) => {
  const sets = await StudySet.find({ owner: user }).select("_id").lean();
  const ids = sets.map((set) => set._id);
  if (!ids.length) return;
  const tests = await Test.find({ set: { $in: ids } }).select("_id").lean();
  const cards = await Flashcard.find({ set: { $in: ids } }).select("_id").lean();
  // Private PDFs are removed from storage first, then the rows.
  const files = await SetMaterial.find({ owner: user, publicId: { $ne: "" } }).select("publicId").lean();
  await Promise.all(files.map((file) => cloudinary.uploader.destroy(file.publicId, { resource_type: "raw", type: "private" }).catch(() => {})));
  await Promise.all([
    SetMaterial.deleteMany({ owner: user }),
    Question.deleteMany({ test: { $in: tests.map((test) => test._id) } }),
    FlashcardProgress.deleteMany({ flashcard: { $in: cards.map((card) => card._id) } }),
    SetNote.deleteMany({ set: { $in: ids } }),
    Test.deleteMany({ set: { $in: ids } }),
    Flashcard.deleteMany({ set: { $in: ids } })
  ]);
  await StudySet.deleteMany({ _id: { $in: ids } });
};

// Everything Catalyst keeps about the student, as one JSON file. It holds the student's own data only:
// never the password hash, and never correct answers or explanations (grading data stays on the server).
const exportData = async (req, res, next) => {
  try {
    const user = req.user.id;
    const own = (Model, select) => Model.find({ user }).select(`-_id -user -__v ${select || ""}`).lean();
    const [profile, progress, testResults, mistakes, flashcards, mastery, notes, bookmarks, positions, studyTime, examAttempts, reports, studySets, myExams, achievements, challenges, friendCount] = await Promise.all([
      User.findById(user).select("name displayName email role avatar emailVerified onboarded examDate dailyGoal weeklyGoal hideActivity xp timeZone notify subscriptionEndsAt createdAt -_id").lean(),
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
      own(Report, "-test -target -link -resolvedBy"),
      exportStudySets(user),
      own(ExamDate),
      own(AchievementUnlock, "-seen"),
      Challenge.find({ $or: [{ creator: user }, { "results.user": user }] }).select("-_id title createdAt results").lean(),
      Friendship.countDocuments({ status: "accepted", $or: [{ requester: user }, { recipient: user }] })
    ]);
    if (!profile) return res.status(404).json({ message: "User not found" });
    res.setHeader("Content-Disposition", 'attachment; filename="catalyst-my-data.json"');
    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      profile, progress, testResults, mistakes, flashcards, mastery, notes, bookmarks, positions, studyTime, examAttempts, reports, studySets, myExams,
      achievements, friends: friendCount,
      // Only this student's own score in each challenge, never the friend's.
      challenges: challenges.map((item) => ({ title: item.title, createdAt: item.createdAt, myResult: item.results.find((row) => String(row.user) === String(user)) ? (({ correct, total, finishedAt }) => ({ correct, total, finishedAt }))(item.results.find((row) => String(row.user) === String(user))) : null }))
    });
  } catch (error) {
    next(error);
  }
};

// Takes the student out of every circle. A circle they owned goes to its longest-standing joined member,
// and one with nobody left is removed.
const leaveAllCircles = async (id) => {
  const circles = await Circle.find({ "members.user": id });
  for (const circle of circles) {
    circle.members = circle.members.filter((member) => String(member.user) !== String(id));
    const joined = circle.members.filter((member) => member.status === "joined");
    if (!joined.length) { await Circle.deleteOne({ _id: circle._id }); continue; }
    if (String(circle.owner) === String(id)) circle.owner = joined[0].user;
    await circle.save();
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
        displayName: null,
        xp: 0,
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
      ExamDate.deleteMany({ user: id }),
      Friendship.deleteMany({ $or: [{ requester: id }, { recipient: id }] }),
      Challenge.deleteMany({ $or: [{ creator: id }, { opponent: id }] }),
      AchievementUnlock.deleteMany({ user: id }),
      XpEntry.deleteMany({ user: id }),
      AiDraft.deleteMany({ owner: id }),
      SetSave.deleteMany({ user: id }),
      SetStudy.deleteMany({ $or: [{ user: id }, { owner: id }] }),
      LeaderboardEntry.deleteMany({ user: id }),
      User.updateOne({ _id: id }, { $unset: { friendCode: 1 } }),
      leaveAllCircles(id),
      deleteStudySets(id),
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
