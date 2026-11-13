const mongoose = require("mongoose");
const authCache = require("../utils/authCache");
const User = require("../models/user.models");
const Course = require("../models/course.models");
const Lesson = require("../models/lesson.models");
const Test = require("../models/test.models");
const Progress = require("../models/progress.models");
const TestResult = require("../models/testresult.models");
const FlashcardProgress = require("../models/flashcardprogress.models");

const DAY = 24 * 60 * 60 * 1000;
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
  subscriptionEndsAt: user.subscriptionEndsAt || null,
  createdAt: user.createdAt
});

const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    // The limit is capped at 100, one of the two fixes I suggested for the old code
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const filter = {};
    const search = String(req.query.q || "").trim().slice(0, 80);
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    if (["student", "admin"].includes(req.query.role)) filter.role = req.query.role;
    const now = new Date();
    if (req.query.status === "active") filter.isActive = { $ne: false };
    if (req.query.status === "inactive") filter.isActive = false;
    if (req.query.status === "subscribed") filter.subscriptionEndsAt = { $gt: now };
    if (req.query.status === "expired") {
      filter.role = "student";
      filter.$and = [{ $or: [{ subscriptionEndsAt: null }, { subscriptionEndsAt: { $lte: now } }] }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email role isActive subscriptionEndsAt createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: users.map(publicUser),
      pagination: {
        currentPage: page,
        limit,
        totalUsers: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Change a user's role, active state or subscription. Admins cannot lock themselves out,
// and the last active admin cannot be removed.
const updateUser = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  const { role, isActive, subscriptionEndsAt, extendMonths } = req.body;
  if (req.params.id === req.user.id && ((role !== undefined && role !== "admin") || isActive === false)) {
    return res.status(400).json({ message: "You cannot remove your own admin access or deactivate your own account" });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const losingAdmin = user.role === "admin" && user.isActive !== false &&
      ((role !== undefined && role !== "admin") || isActive === false);
    if (losingAdmin) {
      const others = await User.countDocuments({ _id: { $ne: user._id }, role: "admin", isActive: { $ne: false } });
      if (!others) return res.status(409).json({ message: "Keep at least one active admin" });
    }

    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (subscriptionEndsAt !== undefined) user.subscriptionEndsAt = subscriptionEndsAt;
    if (extendMonths) {
      // Extending starts from today, or from the current end date when it is still in the future.
      const start = user.subscriptionEndsAt && user.subscriptionEndsAt > new Date() ? new Date(user.subscriptionEndsAt) : new Date();
      start.setUTCMonth(start.getUTCMonth() + extendMonths);
      user.subscriptionEndsAt = start;
    }
    await user.save();
    authCache.forget(user._id);
    return res.status(200).json({ message: "User updated successfully", data: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// Numbers for the admin home page.
const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 7 * DAY);
    const students = { role: "student" };
    const [
      studentTotal, studentActive, joined, admins, subscribed,
      coursesPublished, coursesDraft, lessons, tests, attempts,
      activeA, activeB, activeC
    ] = await Promise.all([
      User.countDocuments(students),
      User.countDocuments({ ...students, isActive: { $ne: false } }),
      User.countDocuments({ ...students, createdAt: { $gte: since } }),
      User.countDocuments({ role: "admin", isActive: { $ne: false } }),
      User.countDocuments({ ...students, subscriptionEndsAt: { $gt: now } }),
      Course.countDocuments({ deletedAt: null, isPublished: true }),
      Course.countDocuments({ deletedAt: null, isPublished: false }),
      Lesson.countDocuments({ deletedAt: null }),
      Test.countDocuments({ deletedAt: null }),
      TestResult.countDocuments({ updatedAt: { $gte: since } }),
      Progress.distinct("user", { updatedAt: { $gte: since } }),
      TestResult.distinct("user", { updatedAt: { $gte: since } }),
      FlashcardProgress.distinct("user", { updatedAt: { $gte: since } })
    ]);
    const active = new Set([...activeA, ...activeB, ...activeC].map(String));
    return res.status(200).json({
      data: {
        students: { total: studentTotal, active: studentActive, joinedLast7Days: joined, activeLast7Days: active.size },
        admins,
        subscriptions: { required: process.env.REQUIRE_SUBSCRIPTION === "true", active: subscribed },
        courses: { published: coursesPublished, draft: coursesDraft },
        lessons,
        tests,
        testAttemptsLast7Days: attempts
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, updateUser, getStats };
