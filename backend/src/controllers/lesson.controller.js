const mongoose = require("mongoose");
const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const TestResult = require("../models/testresult.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");
const Progress = require("../models/progress.models");
const Bookmark = require("../models/bookmark.models");
const Note = require("../models/note.models");
const studentMaterial = require("../utils/studentMaterial");
const LessonVersion = require("../models/lessonversion.models");
const { notifyLessonPublished } = require("./notification.controller");
const getFlashcardSummary = require("../utils/flashcardSummary");
const { findVisibleLesson, findTestsWithQuestions, findTestQuestionCounts } = require("../utils/visibility");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);

const studentTestSummary = async (tests, userId) => {
  const results = await TestResult.find({ user: userId, test: { $in: tests.map((test) => test._id) } })
    .select("test bestScore").lean();
  const scoreByTest = new Map(results.map((item) => [item.test.toString(), item.bestScore]));
  return tests.map((test) => ({
    _id: test._id,
    title: test.title,
    order: test.order,
    questionCount: test.questionCount,
    passPercent: test.passPercent ?? null,
    bestScore: scoreByTest.get(test._id.toString()) ?? null
  }));
};

const adminTestSummary = (tests) => tests.map((test) => ({
  _id: test._id,
  title: test.title,
  order: test.order,
  questionCount: test.questionCount,
  passPercent: test.passPercent ?? null
}));


// Everything a student sees on a lesson. The tests, flashcard summary, material count and (for the hub)
// the materials and the completed flag are independent of each other, so they are read together with the
// visibility check: 3 round trips instead of 9. When the lesson is hidden the extra reads are thrown away.
const loadLesson = async (id, userId, withHub) => {
  const [lesson, tests, flashcards, materials, done, note, saved] = await Promise.all([
    findVisibleLesson(id),
    findTestsWithQuestions({ scope: "lesson", lesson: id, isPublished: true, deletedAt: null }).then((rows) => studentTestSummary(rows, userId)),
    getFlashcardSummary(id, userId),
    Material.find({ lesson: id, isPublished: true, deletedAt: null }).sort({ order: 1 }).lean(),
    withHub ? Progress.exists({ user: userId, lesson: id, completed: true }) : null,
    withHub ? Note.findOne({ user: userId, lesson: id }).select("text").lean() : null,
    withHub ? Bookmark.exists({ user: userId, kind: "lesson", target: id }) : null
  ]);
  if (!lesson) return null;
  const data = {
    _id: lesson._id,
    unit: lesson.unit._id,
    title: lesson.title,
    order: lesson.order,
    explanation: lesson.explanation,
    explanationImage: lesson.explanationImage,
    videoHost: lesson.videoHost,
    videoId: lesson.videoId,
    tests,
    flashcards,
    materialCount: materials.length
  };
  if (withHub) {
    data.completed = Boolean(done);
    data.materials = materials.map(studentMaterial);
    data.note = note ? note.text : "";
    data.saved = Boolean(saved);
  }
  return data;
};

const getLessonByID = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const data = await loadLesson(req.params.id, req.user.id, false);
    if (!data) return res.status(404).json({ message: `Lesson with ID ${req.params.id} not found` });
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

// The lesson screen in one call: the lesson, whether this student finished it, and its materials.
const getLessonHub = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const data = await loadLesson(req.params.id, req.user.id, true);
    if (!data) return res.status(404).json({ message: `Lesson with ID ${req.params.id} not found` });
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

const getLessonForAdmin = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const tests = await findTestQuestionCounts({ scope: "lesson", lesson: lesson._id, deletedAt: null });
    const flashcards = await Flashcard.find({ lesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean();
    const materials = await Material.find({ lesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: { ...lesson, tests: adminTestSummary(tests), flashcards, materials } });
  } catch (error) {
    next(error);
  }
};

const createLesson = async (req, res, next) => {
  try {
    const unit = await Unit.findOne({ _id: req.body.unit, deletedAt: null }).populate("course", "deletedAt");
    if (!unit || !unit.course || unit.course.deletedAt) return res.status(404).json({ message: "Unit not found" });
    const lesson = await Lesson.create(req.body);
    return res.status(201).json({ message: "Lesson created successfully", data: lesson });
  } catch (error) {
    next(error);
  }
};

// Lesson history: what an admin writes, kept before each save that changes it. The newest 50 stay.
const CONTENT_FIELDS = ["title", "explanation", "explanationImage", "videoHost", "videoId"];
const HISTORY_LIMIT = 50;
const imageKey = (image) => (image && image.url ? [image.url, image.publicId, image.alt, image.width, image.height].join("|") : "");
const fieldKey = (field, value) => (field === "explanationImage" ? imageKey(value) : String(value ?? ""));
const contentChanged = (current, update) => CONTENT_FIELDS.some((field) => field in update && fieldKey(field, current[field]) !== fieldKey(field, update[field]));

const saveVersion = async (lesson, adminId, reason) => {
  await LessonVersion.create({
    lesson: lesson._id, title: lesson.title, explanation: lesson.explanation, explanationImage: lesson.explanationImage || null,
    videoHost: lesson.videoHost || "", videoId: lesson.videoId || "", savedBy: adminId, reason
  });
  const old = await LessonVersion.find({ lesson: lesson._id }).sort({ createdAt: -1 }).skip(HISTORY_LIMIT).select("_id").lean();
  if (old.length) await LessonVersion.deleteMany({ _id: { $in: old.map((v) => v._id) } });
};

const updateLesson = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    if (req.body.unit) {
      const unit = await Unit.findOne({ _id: req.body.unit, deletedAt: null }).populate("course", "deletedAt");
      if (!unit || !unit.course || unit.course.deletedAt) return res.status(404).json({ message: "Unit not found" });
    }
    const before = await Lesson.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!before) return res.status(404).json({ message: "Lesson not found" });
    // The text as it was is kept when a save changes it. Changing only order, unit or published state is not history.
    if (contentChanged(before, req.body)) await saveVersion(before, req.user.id, "edit");
    const lesson = await Lesson.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, req.body, { returnDocument: "after", runValidators: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    // Only the move from hidden to published tells students. Saving an already published lesson stays quiet.
    if (req.body.isPublished === true && !before.isPublished) notifyLessonPublished(lesson._id);
    return res.status(200).json({ message: "Lesson updated successfully", data: lesson });
  } catch (error) {
    next(error);
  }
};

// ADMIN: the saved versions of a lesson, newest first.
const listLessonVersions = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    if (!(await Lesson.exists({ _id: req.params.id, deletedAt: null }))) return res.status(404).json({ message: "Lesson not found" });
    const versions = await LessonVersion.find({ lesson: req.params.id }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).populate("savedBy", "name").lean();
    return res.status(200).json({
      data: versions.map((v) => ({
        _id: v._id, createdAt: v.createdAt, reason: v.reason, title: v.title, savedBy: v.savedBy ? v.savedBy.name : "Unknown",
        excerpt: v.explanation.slice(0, 200), explanation: v.explanation, videoId: v.videoId, hasImage: Boolean(v.explanationImage && v.explanationImage.url)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: put an older version back. The text being replaced is saved first, so a restore can itself be undone.
const restoreLessonVersion = async (req, res, next) => {
  if (badId(req.params.id) || badId(req.params.versionId)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const [current, version] = await Promise.all([
      Lesson.findOne({ _id: req.params.id, deletedAt: null }).lean(),
      LessonVersion.findOne({ _id: req.params.versionId, lesson: req.params.id }).lean()
    ]);
    if (!current) return res.status(404).json({ message: "Lesson not found" });
    if (!version) return res.status(404).json({ message: "Version not found" });
    await saveVersion(current, req.user.id, "restore");
    const set = { title: version.title, explanation: version.explanation, videoHost: version.videoHost, videoId: version.videoId };
    const update = version.explanationImage && version.explanationImage.url
      ? { $set: { ...set, explanationImage: version.explanationImage } }
      : { $set: set, $unset: { explanationImage: "" } };
    const lesson = await Lesson.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, update, { returnDocument: "after", runValidators: true });
    return res.status(200).json({ message: "Version restored", data: lesson });
  } catch (error) {
    next(error);
  }
};

const deleteLesson = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await Lesson.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { returnDocument: "after" });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    return res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLessonByID, getLessonHub, getLessonForAdmin, createLesson, updateLesson, deleteLesson, listLessonVersions, restoreLessonVersion };
