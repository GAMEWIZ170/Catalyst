const mongoose = require("mongoose");
const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");
const Question = require("../models/question.models");
const Bookmark = require("../models/bookmark.models");
const Note = require("../models/note.models");
const { findVisibleLesson, findVisibleTest } = require("../utils/visibility");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Lessons a student may see, with their unit and course, for a given first-stage match.
// "extra" runs right after the match (a text search must sort and limit before the lookups).
const visibleLessons = (match, extra = []) => Lesson.aggregate([
  { $match: { ...match, isPublished: true, deletedAt: null } },
  ...extra,
  { $lookup: { from: Unit.collection.name, localField: "unit", foreignField: "_id", pipeline: [{ $match: { deletedAt: null } }, { $project: { title: 1, course: 1 } }], as: "unit" } },
  { $unwind: "$unit" },
  { $lookup: { from: Course.collection.name, localField: "unit.course", foreignField: "_id", pipeline: [{ $match: { isPublished: true, deletedAt: null } }, { $project: { code: 1 } }], as: "course" } },
  { $unwind: "$course" },
  { $project: { title: 1, "unit.title": 1, "course._id": 1, "course.code": 1 } }
]);

// STUDENT: search lesson titles and text. Only lessons the student may see.
const search = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    if (q.length < 2) return res.status(400).json({ message: "Type at least 2 characters to search" });
    const rows = await visibleLessons({ $text: { $search: q } }, [
      { $addFields: { score: { $meta: "textScore" } } },
      { $sort: { score: -1 } },
      { $limit: 20 }
    ]);
    const data = rows.map((row) => ({ lessonId: row._id, title: row.title, unit: row.unit.title, course: row.course.code, courseId: row.course._id }));
    return res.status(200).json({ count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// STUDENT: the saved list. Anything that has since been hidden or deleted is left out.
const listBookmarks = async (req, res, next) => {
  try {
    const marks = await Bookmark.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
    const lessonIds = marks.filter((mark) => mark.kind === "lesson").map((mark) => mark.target);
    const questionIds = marks.filter((mark) => mark.kind === "question").map((mark) => mark.target);
    const [lessons, questions] = await Promise.all([
      lessonIds.length ? visibleLessons({ _id: { $in: lessonIds } }) : [],
      questionIds.length ? Question.find({ _id: { $in: questionIds }, deletedAt: null }).select("test text").lean() : []
    ]);
    const lessonById = new Map(lessons.map((row) => [row._id.toString(), row]));
    const tests = new Map();
    await Promise.all([...new Set(questions.map((question) => question.test.toString()))].map(async (testId) => {
      tests.set(testId, await findVisibleTest(testId));
    }));
    const questionById = new Map(questions.map((question) => [question._id.toString(), question]));
    const data = [];
    for (const mark of marks) {
      const key = mark.target.toString();
      if (mark.kind === "lesson" && lessonById.has(key)) {
        const row = lessonById.get(key);
        data.push({ kind: "lesson", id: key, title: row.title, detail: `${row.course.code} · ${row.unit.title}`, link: `/lessons/${key}` });
      } else if (mark.kind === "question" && questionById.has(key)) {
        const question = questionById.get(key);
        const test = tests.get(question.test.toString());
        if (test) data.push({ kind: "question", id: key, title: question.text.slice(0, 140), detail: `Question in ${test.title}`, link: `/tests/${test._id}` });
      }
    }
    return res.status(200).json({ count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const saveBookmark = async (req, res, next) => {
  try {
    const { kind, id } = req.body;
    if (kind === "lesson") {
      if (!(await findVisibleLesson(id))) return res.status(404).json({ message: "Lesson not found" });
    } else {
      const question = await Question.findOne({ _id: id, deletedAt: null }).select("test").lean();
      if (!question || !(await findVisibleTest(question.test))) return res.status(404).json({ message: "Question not found" });
    }
    await Bookmark.updateOne({ user: req.user.id, kind, target: oid(id) }, { $setOnInsert: { user: req.user.id, kind, target: oid(id) } }, { upsert: true });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

const removeBookmark = async (req, res, next) => {
  if (!["lesson", "question"].includes(req.params.kind) || badId(req.params.id)) return res.status(400).json({ message: "Invalid bookmark" });
  try {
    await Bookmark.deleteOne({ user: req.user.id, kind: req.params.kind, target: req.params.id });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// STUDENT: the private note on a lesson. Empty text removes it.
const saveNote = async (req, res, next) => {
  if (badId(req.params.lessonId)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    if (!(await findVisibleLesson(req.params.lessonId))) return res.status(404).json({ message: "Lesson not found" });
    const { text } = req.body;
    if (!text) await Note.deleteOne({ user: req.user.id, lesson: req.params.lessonId });
    else await Note.updateOne({ user: req.user.id, lesson: req.params.lessonId }, { $set: { text } }, { upsert: true });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { search, listBookmarks, saveBookmark, removeBookmark, saveNote };
