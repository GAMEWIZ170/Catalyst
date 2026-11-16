const mongoose = require("mongoose");
const ExamDate = require("./examdate.models");
const Course = require("../courses/course.models");
const { dayKey } = require("../../utils/day");

const DAY = 24 * 60 * 60 * 1000;
const MAX_EXAMS = 20;

const daysBetween = (fromKey, toKey) => Math.round((Date.parse(toKey) - Date.parse(fromKey)) / DAY);

// The student's exams with the days left, counted in the student's own calendar days.
const loadExams = async (userId, timeZone) => {
  const rows = await ExamDate.find({ user: userId }).populate({ path: "course", select: "code title" }).sort({ startsAt: 1 }).lean();
  const today = dayKey(timeZone);
  const items = rows.filter((row) => row.course).map((row) => ({
    id: row._id,
    course: { id: row.course._id, code: row.course.code, title: row.course.title },
    startsAt: row.startsAt,
    type: row.type,
    daysLeft: daysBetween(today, dayKey(timeZone, row.startsAt))
  }));
  return {
    upcoming: items.filter((item) => item.daysLeft >= 0),
    past: items.filter((item) => item.daysLeft < 0).reverse()
  };
};

// STUDENT: upcoming exams (nearest first) and past exams (latest first).
const list = async (req, res, next) => {
  try {
    return res.status(200).json({ data: await loadExams(req.user.id, req.user.timeZone) });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    if ((await ExamDate.countDocuments({ user: req.user.id })) >= MAX_EXAMS) return res.status(409).json({ message: `You can keep up to ${MAX_EXAMS} exams. Delete an old one first.` });
    if (!(await Course.exists({ _id: req.body.course, isPublished: true, deletedAt: null }))) return res.status(404).json({ message: "Course not found" });
    const exam = await ExamDate.create({ user: req.user.id, course: req.body.course, startsAt: req.body.startsAt, type: req.body.type });
    return res.status(201).json({ message: "Exam added", data: { id: exam._id } });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid exam ID" });
  try {
    const gone = await ExamDate.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!gone) return res.status(404).json({ message: "Exam not found" });
    return res.status(200).json({ message: "Exam deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, remove, loadExams };
