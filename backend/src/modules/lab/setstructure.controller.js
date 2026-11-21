const mongoose = require("mongoose");
const StudySet = require("./studyset.models");
const SetUnit = require("./setunit.models");
const SetLesson = require("./setlesson.models");
const SetMastery = require("./setmastery.models");
const Flashcard = require("../flashcards/flashcard.models");
const FlashcardProgress = require("../flashcards/flashcardprogress.models");
const Test = require("../assessments/test.models");
const Question = require("../assessments/question.models");
const TestResult = require("../assessments/testresult.models");
const Mistake = require("../assessments/mistake.models");
const { findOwnSet } = require("../../utils/ownSet");
const { findSharedSet } = require("../../utils/sharedSet");
const { studentQuestion, questionForAdmin } = require("../../utils/serializers");
const { markLessonDone, LABELS } = require("../../utils/setMastery");
const { logEvent } = require("../../utils/events");
const { buildOf } = require("./setbuild.controller");

// A study set as a mini course: set > unit > lesson. Reading (the outline, a lesson, the quick check) works for the owner
// and for anyone the set was shared with by link. Changing anything is for the owner only. Everyone else gets 404, so a
// private set looks the same as one that does not exist. Progress (lessons done, mastery) is always the reader's own.

const MAX_UNITS = 20;
const MAX_LESSONS = 60;   // per set
const CHECK_SIZE = 3;     // questions in a lesson's quick check
const badId = (id) => !mongoose.isObjectIdOrHexString(String(id));
const notFound = (res, what = "Study set") => res.status(404).json({ message: `${what} not found` });
const same = (a, b) => String(a) === String(b);
const touch = (setId) => StudySet.updateOne({ _id: setId }, { $set: { updatedAt: new Date() } });

// The unit or lesson with this id, with its set, when `findSet` (own or shared) lets this student have it.
const unitFor = async (unitId, userId, findSet) => {
  if (badId(unitId)) return null;
  const unit = await SetUnit.findOne({ _id: unitId, deletedAt: null });
  const set = unit && (await findSet(unit.set, userId));
  return set ? { unit, set } : null;
};

const lessonFor = async (lessonId, userId, findSet) => {
  if (badId(lessonId)) return null;
  const lesson = await SetLesson.findOne({ _id: lessonId, deletedAt: null });
  if (!lesson || !(await SetUnit.exists({ _id: lesson.unit, deletedAt: null }))) return null;
  const set = await findSet(lesson.set, userId);
  return set ? { lesson, set } : null;
};

// Units and lessons of a set in course order (lessons without their notes: those can be large).
const treeOf = async (setId) => {
  const [units, lessons] = await Promise.all([
    SetUnit.find({ set: setId, deletedAt: null }).sort({ order: 1 }).lean(),
    SetLesson.find({ set: setId, deletedAt: null }).select("unit title order").sort({ order: 1 }).lean()
  ]);
  return units.map((unit) => ({ ...unit, lessons: lessons.filter((lesson) => same(lesson.unit, unit._id)) }));
};

const publicUnit = (unit) => ({ id: unit._id, title: unit.title, order: unit.order });
const publicLesson = (lesson) => ({ id: lesson._id, unit: lesson.unit, title: lesson.title, order: lesson.order, content: lesson.content || null, updatedAt: lesson.updatedAt });

// STUDENT: the set's path: units with their mastery, lessons with "done", the unit quizzes and the whole-set tests.
const outline = async (req, res, next) => {
  try {
    const set = await findSharedSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const mine = same(set.owner, req.user.id);
    const [tree, written, cardRows, tests, mastery] = await Promise.all([
      treeOf(set._id),
      SetLesson.find({ set: set._id, deletedAt: null, content: { $ne: null } }).distinct("_id"),
      Flashcard.aggregate([{ $match: { set: set._id, deletedAt: null } }, { $group: { _id: "$setLesson", n: { $sum: 1 } } }]),
      Test.find({ set: set._id, deletedAt: null, isPublished: true }).sort({ order: 1 }).lean(),
      SetMastery.find({ user: req.user.id, set: set._id }).lean()
    ]);
    const testIds = tests.map((test) => test._id);
    const [counts, results] = await Promise.all([
      Question.aggregate([{ $match: { test: { $in: testIds }, deletedAt: null } }, { $group: { _id: "$test", n: { $sum: 1 } } }]),
      TestResult.find({ user: req.user.id, test: { $in: testIds } }).select("test bestScore lastScore attempts").lean()
    ]);
    const questionCount = new Map(counts.map((row) => [String(row._id), row.n]));
    const resultOf = new Map(results.map((row) => [String(row.test), row]));
    const hasNotes = new Set(written.map(String));
    const cardCount = new Map(cardRows.map((row) => [String(row._id), row.n]));
    const masteryOf = new Map(mastery.map((row) => [String(row.unit), row]));
    const quizCard = (test) => {
      const result = resultOf.get(String(test._id));
      return { id: test._id, title: test.title, questionCount: questionCount.get(String(test._id)) || 0, bestScore: result ? result.bestScore : null, attempts: result?.attempts || 0 };
    };

    let total = 0;
    let done = 0;
    let next = null;
    const liveLessons = new Set();
    const units = tree.map((unit) => {
      const row = masteryOf.get(String(unit._id));
      const finished = new Set((row?.lessonsDone || []).map(String));
      const lessons = unit.lessons.map((lesson) => {
        const isDone = finished.has(String(lesson._id));
        liveLessons.add(String(lesson._id));
        total += 1;
        if (isDone) done += 1;
        else if (!next) next = { lesson: lesson._id, unit: unit._id, title: lesson.title };
        return { id: lesson._id, title: lesson.title, order: lesson.order, hasNotes: hasNotes.has(String(lesson._id)), cardCount: cardCount.get(String(lesson._id)) || 0, done: isDone };
      });
      const level = row?.level || 0;
      return {
        ...publicUnit(unit),
        mastery: { level, label: LABELS[level], bestScore: row?.attempts ? row.bestScore : null, attempts: row?.attempts || 0 },
        lessons,
        quizzes: tests.filter((test) => test.setUnit && same(test.setUnit, unit._id)).map(quizCard)
      };
    });
    const unitIds = new Set(tree.map((unit) => String(unit._id)));
    // Cards that sit in no lesson (made by hand, or left behind when their lesson was deleted).
    const looseCards = cardRows.filter((row) => !row._id || !liveLessons.has(String(row._id))).reduce((sum, row) => sum + row.n, 0);

    return res.status(200).json({
      data: {
        id: set._id, title: set.title, description: set.description, topic: set.topic, mine,
        visibility: mine ? set.visibility : undefined,
        build: mine ? buildOf(set) : undefined,
        units,
        tests: tests.filter((test) => !test.setUnit || !unitIds.has(String(test.setUnit))).map(quizCard),
        looseCards,
        progress: { lessons: total, done },
        next
      }
    });
  } catch (error) {
    next(error);
  }
};

// --- units (owner)
const createUnit = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if ((await SetUnit.countDocuments({ set: set._id, deletedAt: null })) >= MAX_UNITS) return res.status(409).json({ message: `A set can hold up to ${MAX_UNITS} units` });
    const last = await SetUnit.findOne({ set: set._id, deletedAt: null }).sort({ order: -1 }).select("order").lean();
    const unit = await SetUnit.create({ set: set._id, title: req.body.title || "New unit", order: (last?.order || 0) + 1 });
    await touch(set._id);
    return res.status(201).json({ message: "Unit added", data: { ...publicUnit(unit), lessons: [] } });
  } catch (error) {
    next(error);
  }
};

const updateUnit = async (req, res, next) => {
  try {
    const found = await unitFor(req.params.unitId, req.user.id, findOwnSet);
    if (!found) return notFound(res, "Unit");
    found.unit.title = req.body.title;
    await found.unit.save();
    await touch(found.set._id);
    return res.status(200).json({ message: "Unit saved", data: publicUnit(found.unit) });
  } catch (error) {
    next(error);
  }
};

// Deleting a unit hides its lessons and its quiz with it. The flashcards of those lessons stay in the set, in no lesson.
const deleteUnit = async (req, res, next) => {
  try {
    const found = await unitFor(req.params.unitId, req.user.id, findOwnSet);
    if (!found) return notFound(res, "Unit");
    const now = new Date();
    const lessonIds = await SetLesson.find({ unit: found.unit._id, deletedAt: null }).distinct("_id");
    found.unit.deletedAt = now;
    await found.unit.save();
    await Promise.all([
      SetLesson.updateMany({ _id: { $in: lessonIds } }, { $set: { deletedAt: now } }),
      Flashcard.updateMany({ setLesson: { $in: lessonIds } }, { $set: { setLesson: null } }),
      Test.updateMany({ set: found.set._id, setUnit: found.unit._id, deletedAt: null }, { $set: { deletedAt: now } }),
      touch(found.set._id)
    ]);
    return res.status(200).json({ message: "Unit deleted" });
  } catch (error) {
    next(error);
  }
};

// Puts rows in a new order. The list must hold every row exactly once.
const reorder = async (Model, filter, ids, res, what) => {
  const have = new Set((await Model.find(filter).select("_id").lean()).map((row) => String(row._id)));
  if (ids.length !== have.size || !ids.every((id) => have.has(String(id)))) return res.status(400).json({ message: `The list must contain every ${what} once` });
  await Model.bulkWrite(ids.map((id, at) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: at + 1 } } } })));
  return res.status(200).json({ message: "Order saved" });
};

const reorderUnits = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    return await reorder(SetUnit, { set: set._id, deletedAt: null }, req.body.ids, res, "unit of this set");
  } catch (error) {
    next(error);
  }
};

const reorderLessons = async (req, res, next) => {
  try {
    const found = await unitFor(req.params.unitId, req.user.id, findOwnSet);
    if (!found) return notFound(res, "Unit");
    return await reorder(SetLesson, { unit: found.unit._id, deletedAt: null }, req.body.ids, res, "lesson of this unit");
  } catch (error) {
    next(error);
  }
};

// --- lessons
const lastLessonOrder = async (unitId) => (await SetLesson.findOne({ unit: unitId, deletedAt: null }).sort({ order: -1 }).select("order").lean())?.order || 0;

const createLesson = async (req, res, next) => {
  try {
    const found = await unitFor(req.params.unitId, req.user.id, findOwnSet);
    if (!found) return notFound(res, "Unit");
    if ((await SetLesson.countDocuments({ set: found.set._id, deletedAt: null })) >= MAX_LESSONS) return res.status(409).json({ message: `A set can hold up to ${MAX_LESSONS} lessons` });
    const lesson = await SetLesson.create({ set: found.set._id, unit: found.unit._id, title: req.body.title || "New lesson", order: (await lastLessonOrder(found.unit._id)) + 1 });
    await touch(found.set._id);
    return res.status(201).json({ message: "Lesson added", data: publicLesson(lesson) });
  } catch (error) {
    next(error);
  }
};

// STUDENT: one lesson to study: its notes, its flashcards with this student's rating, the quick check, and what comes
// before and after it. Ratings go to POST /flashcards/:id/rate, like every other deck.
const getLesson = async (req, res, next) => {
  try {
    const found = await lessonFor(req.params.lessonId, req.user.id, findSharedSet);
    if (!found) return notFound(res, "Lesson");
    const { lesson, set } = found;
    const [tree, cards, quizzes, row] = await Promise.all([
      treeOf(set._id),
      Flashcard.find({ set: set._id, setLesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean(),
      Test.find({ set: set._id, setUnit: lesson.unit, deletedAt: null, isPublished: true }).select("_id").lean(),
      SetMastery.findOne({ user: req.user.id, unit: lesson.unit }).select("lessonsDone").lean()
    ]);
    const [progress, checkCount] = await Promise.all([
      FlashcardProgress.find({ user: req.user.id, flashcard: { $in: cards.map((card) => card._id) } }).select("flashcard confidence").lean(),
      Question.countDocuments({ test: { $in: quizzes.map((quiz) => quiz._id) }, deletedAt: null })
    ]);
    const confidence = new Map(progress.map((item) => [String(item.flashcard), item.confidence]));
    const path = tree.flatMap((unit) => unit.lessons.map((item) => ({ id: item._id, title: item.title, unit: unit._id })));
    const at = path.findIndex((item) => same(item.id, lesson._id));
    const unit = tree.find((item) => same(item._id, lesson.unit));
    return res.status(200).json({
      data: {
        ...publicLesson(lesson),
        unit: unit ? publicUnit(unit) : null,
        set: { id: set._id, title: set.title },
        mine: same(set.owner, req.user.id),
        done: (row?.lessonsDone || []).some((id) => same(id, lesson._id)),
        cards: cards.map((card) => ({ _id: card._id, front: card.front, back: card.back, order: card.order, confidence: confidence.get(String(card._id)) || null })),
        check: { questions: Math.min(CHECK_SIZE, checkCount) },
        previous: at > 0 ? path[at - 1] : null,
        next: at >= 0 && at < path.length - 1 ? path[at + 1] : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// OWNER: the title, the notes (autosave), or a move to another unit of the same set.
const updateLesson = async (req, res, next) => {
  try {
    const found = await lessonFor(req.params.lessonId, req.user.id, findOwnSet);
    if (!found) return notFound(res, "Lesson");
    const { lesson, set } = found;
    if (req.body.unit !== undefined && !same(req.body.unit, lesson.unit)) {
      const target = await SetUnit.findOne({ _id: req.body.unit, set: set._id, deletedAt: null }).select("_id").lean();
      if (!target) return notFound(res, "Unit");
      lesson.order = (await lastLessonOrder(target._id)) + 1;
      lesson.unit = target._id;
    }
    if (req.body.title !== undefined) lesson.title = req.body.title;
    if (req.body.content !== undefined) {
      lesson.content = req.body.content;
      lesson.markModified("content");
    }
    await lesson.save();
    await touch(set._id);
    return res.status(200).json({ message: "Lesson saved", data: { id: lesson._id, unit: lesson.unit, title: lesson.title, order: lesson.order, updatedAt: lesson.updatedAt } });
  } catch (error) {
    next(error);
  }
};

// Deleting a lesson keeps its flashcards in the set, in no lesson, so the student's cards are never lost with it.
const deleteLesson = async (req, res, next) => {
  try {
    const found = await lessonFor(req.params.lessonId, req.user.id, findOwnSet);
    if (!found) return notFound(res, "Lesson");
    found.lesson.deletedAt = new Date();
    await found.lesson.save();
    await Promise.all([Flashcard.updateMany({ setLesson: found.lesson._id }, { $set: { setLesson: null } }), touch(found.set._id)]);
    return res.status(200).json({ message: "Lesson deleted" });
  } catch (error) {
    next(error);
  }
};

// STUDENT: "I finished this lesson". Counts for the reader, on their own progress.
const finishLesson = async (req, res, next) => {
  try {
    const found = await lessonFor(req.params.lessonId, req.user.id, findSharedSet);
    if (!found) return notFound(res, "Lesson");
    await markLessonDone(req.user.id, found.lesson);
    logEvent(req.user.id, "set_lesson_done", { set: found.set._id, lesson: found.lesson._id });
    return res.status(200).json({ message: "Lesson done", data: { done: true } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: the lesson's quick check: a few questions picked at random from the quiz of the lesson's unit. No answers are
// sent: each one is graded by POST /questions/:id/answer, like in a test.
const quickCheck = async (req, res, next) => {
  try {
    const found = await lessonFor(req.params.lessonId, req.user.id, findSharedSet);
    if (!found) return notFound(res, "Lesson");
    const quizzes = await Test.find({ set: found.set._id, setUnit: found.lesson.unit, deletedAt: null, isPublished: true }).select("_id").lean();
    const questions = await Question.aggregate([{ $match: { test: { $in: quizzes.map((quiz) => quiz._id) }, deletedAt: null, type: { $in: ["mcq", "true_false"] } } }, { $sample: { size: CHECK_SIZE } }]);
    return res.status(200).json({ data: { title: "Quick check", questions: questions.map(studentQuestion) } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: the questions of this set the student got wrong and has not yet cleared, to practise again (up to 20,
// most-missed first). No answers are sent. Answering right on two different days clears a question.
const setMistakes = async (req, res, next) => {
  try {
    const set = await findSharedSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const tests = await Test.find({ set: set._id, deletedAt: null, isPublished: true }).distinct("_id");
    const questions = await Question.find({ test: { $in: tests }, deletedAt: null }).lean();
    const byId = new Map(questions.map((question) => [String(question._id), question]));
    const mistakes = await Mistake.find({ user: req.user.id, question: { $in: questions.map((question) => question._id) } }).sort({ wrongCount: -1, lastWrongAt: -1 }).limit(20).lean();
    return res.status(200).json({ data: { title: "Practise my mistakes", total: mistakes.length, questions: mistakes.map((mistake) => studentQuestion(byId.get(String(mistake.question)))) } });
  } catch (error) {
    next(error);
  }
};

// OWNER ONLY: the whole set in one answer, to keep on the device for studying offline: notes, flashcards, and the quizzes
// WITH their answers and explanations. Answers leave the server here because the set is the student's own work: this is
// never offered for a set someone else shared, where grading stays on the server.
const offlineBundle = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const [units, lessons, cards, tests] = await Promise.all([
      SetUnit.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean(),
      SetLesson.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean(),
      Flashcard.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean(),
      Test.find({ set: set._id, deletedAt: null, isPublished: true }).sort({ order: 1 }).lean()
    ]);
    const [questions, progress] = await Promise.all([
      Question.find({ test: { $in: tests.map((test) => test._id) }, deletedAt: null, type: { $in: ["mcq", "true_false", "fill_blank", "short_answer"] } }).sort({ order: 1 }).lean(),
      FlashcardProgress.find({ user: req.user.id, flashcard: { $in: cards.map((card) => card._id) } }).select("flashcard confidence").lean()
    ]);
    const confidence = new Map(progress.map((item) => [String(item.flashcard), item.confidence]));
    const live = new Set(lessons.map((lesson) => String(lesson._id)));
    const offlineQuestion = (question) => {
      const full = questionForAdmin(question);
      return {
        _id: full._id, type: full.type, text: full.text, order: full.order, explanation: full.explanation || "",
        options: (full.options || []).map((option) => ({ _id: option._id, text: option.text })),
        correctOption: full.correctOption || null, correctIndex: full.correctIndex, correctAnswer: full.correctAnswer || null,
        // fill_blank is graded on the device like on the server (case and extra spaces ignored). short_answer cannot be
        // marked by the AI offline, so the device shows the model answer and key points and the student marks it.
        acceptedAnswers: full.acceptedAnswers || [], modelAnswer: full.modelAnswer || "", keyPoints: full.keyPoints || []
      };
    };
    return res.status(200).json({
      data: {
        id: set._id, title: set.title, description: set.description, topic: set.topic, updatedAt: set.updatedAt, savedAt: new Date(),
        units: units.map((unit) => ({ ...publicUnit(unit), lessons: lessons.filter((lesson) => same(lesson.unit, unit._id)).map((lesson) => ({ id: lesson._id, title: lesson.title, order: lesson.order, content: lesson.content || null })) })),
        cards: cards.map((card) => ({ _id: card._id, lesson: card.setLesson && live.has(String(card.setLesson)) ? card.setLesson : null, front: card.front, back: card.back, order: card.order, confidence: confidence.get(String(card._id)) || null })),
        quizzes: tests.map((test) => ({ id: test._id, title: test.title, unit: test.setUnit || null, questions: questions.filter((question) => same(question.test, test._id)).map(offlineQuestion) }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  outline, createUnit, updateUnit, deleteUnit, reorderUnits, createLesson, getLesson, updateLesson, deleteLesson, reorderLessons,
  finishLesson, quickCheck, setMistakes, offlineBundle, lessonFor, unitFor
};
