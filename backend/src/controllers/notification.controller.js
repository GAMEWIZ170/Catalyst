const mongoose = require("mongoose");
const Notification = require("../models/notification.models");
const User = require("../models/user.models");
const Lesson = require("../models/lesson.models");
const { dueCards } = require("./review.controller");
const { visibleMistakes, isDue } = require("./mistake.controller");

const LIST_SIZE = 20;
const publicNotification = (n) => ({ id: n._id, type: n.type, title: n.title, body: n.body, link: n.link, read: Boolean(n.readAt), createdAt: n.createdAt });

// A student with cards or mistakes due gets one message per UTC day. Made when the bell loads, so there is
// no background job. The key is checked first, so on most loads this costs one indexed lookup.
const ensureDueNotification = async (userId) => {
  const key = `review:${new Date().toISOString().slice(0, 10)}`;
  if (await Notification.exists({ user: userId, key })) return;
  const [cards, mistakes] = await Promise.all([dueCards(userId), visibleMistakes(userId)]);
  const dueMistakes = mistakes.filter(isDue).length;
  if (!cards.length && !dueMistakes) return;
  const parts = [];
  if (cards.length) parts.push(`${cards.length} ${cards.length === 1 ? "flashcard" : "flashcards"}`);
  if (dueMistakes) parts.push(`${dueMistakes} ${dueMistakes === 1 ? "mistake" : "mistakes"}`);
  try {
    await Notification.create({ user: userId, type: "review", key, title: "Review is ready", body: `${parts.join(" and ")} due today.`, link: "/review" });
  } catch (error) {
    if (error.code !== 11000) throw error; // two tabs asked at once: the other one made it
  }
};

// Called after an admin publishes a lesson. One message per active student, once per lesson.
// Never throws: a failed message must not fail the publish.
const notifyLessonPublished = async (lessonId) => {
  try {
    const lesson = await Lesson.findOne({ _id: lessonId, isPublished: true, deletedAt: null })
      .populate({ path: "unit", select: "deletedAt course", populate: { path: "course", select: "title isPublished deletedAt" } })
      .lean();
    const unit = lesson && lesson.unit;
    const course = unit && unit.course;
    if (!unit || unit.deletedAt || !course || !course.isPublished || course.deletedAt) return;
    const students = await User.find({ role: "student", isActive: { $ne: false }, deletedAt: null }).select("_id").lean();
    if (!students.length) return;
    const docs = students.map((s) => ({
      user: s._id, type: "lesson", key: `lesson:${lesson._id}`, title: "New lesson", body: `${lesson.title} is now in ${course.title}.`, link: `/lessons/${lesson._id}`
    }));
    // ordered:false skips the students who already have this lesson's message (duplicate key) and keeps going.
    await Notification.insertMany(docs, { ordered: false }).catch((error) => { if (!error.writeErrors && error.code !== 11000) throw error; });
  } catch (error) {
    console.error("Lesson notification failed:", error.message);
  }
};

// STUDENT: the bell. Unread count plus the newest messages.
const list = async (req, res, next) => {
  try {
    if (req.user.role === "student") await ensureDueNotification(req.user.id);
    const [unread, items] = await Promise.all([
      Notification.countDocuments({ user: req.user.id, readAt: null }),
      Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(LIST_SIZE).lean()
    ]);
    return res.status(200).json({ data: { unread, items: items.map(publicNotification) } });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid notification ID" });
    const done = await Notification.updateOne({ _id: req.params.id, user: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
    if (!done.matchedCount && !(await Notification.exists({ _id: req.params.id, user: req.user.id }))) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
    return res.status(200).json({ message: "All marked as read" });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, markRead, markAllRead, notifyLessonPublished };
