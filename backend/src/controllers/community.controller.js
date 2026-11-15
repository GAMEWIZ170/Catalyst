const mongoose = require("mongoose");
const StudySet = require("../models/studyset.models");
const SetNote = require("../models/setnote.models");
const SetSave = require("../models/setsave.models");
const SetStudy = require("../models/setstudy.models");
const Flashcard = require("../models/flashcard.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const Course = require("../models/course.models");
const { findOwnSet } = require("../utils/ownSet");
const { slugOf } = require("../utils/courseMeta");
const { findSharedSet, authorNames } = require("../utils/sharedSet");
const { notesToText } = require("./aigenerate.controller");
const { logEvent } = require("../utils/events");
const { awardXp } = require("../utils/xp");

const PAGE = 20;
const MIN_ITEMS = 3;       // cards plus quiz questions a set needs before it can go to the community
const MAX_SETS = 100;      // the same limit as making a set
const badId = (id) => !mongoose.isObjectIdOrHexString(String(id));
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const utcDay = () => new Date().toISOString().slice(0, 10);
const notFound = (res, what = "Study set") => res.status(404).json({ message: `${what} not found` });

const itemCount = async (setId) => {
  const tests = await Test.find({ set: setId, deletedAt: null }).select("_id").lean();
  const [cards, questions] = await Promise.all([
    Flashcard.countDocuments({ set: setId, deletedAt: null }),
    Question.countDocuments({ test: { $in: tests.map((test) => test._id) }, deletedAt: null })
  ]);
  return { cards, questions, total: cards + questions };
};

// OWNER: who may see this set. "private" (only the owner), "link" (anyone with the link) or "community" (the public shelf,
// after an admin approves it, and only with the originality declaration). Going back to private or link takes a set off the shelf.
const setVisibility = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const { visibility, declaration } = req.body;
    if (visibility === "community") {
      if (set.communityStatus === "removed") return res.status(409).json({ message: "An admin removed this set from the community, so it cannot be shared there again." });
      if (declaration !== true) return res.status(400).json({ message: "Please confirm that this set is your own work, or that you have the right to share it." });
      if (set.communityStatus === "approved" || set.communityStatus === "pending") return res.status(200).json({ message: "Already shared with the community", data: { visibility: set.visibility, communityStatus: set.communityStatus } });
      const items = await itemCount(set._id);
      if (items.total < MIN_ITEMS) return res.status(409).json({ message: `Add at least ${MIN_ITEMS} flashcards or quiz questions before sharing with the community. This set has ${items.total}.` });
      set.visibility = "link"; // reachable by link while it waits for approval
      set.communityStatus = "pending";
      set.declaredAt = new Date();
      set.submittedAt = new Date();
      set.reviewNote = "";
    } else {
      set.visibility = visibility;
      if (set.communityStatus === "approved" || set.communityStatus === "pending") set.communityStatus = "none";
    }
    await set.save();
    return res.status(200).json({ message: visibility === "community" ? "Sent for a quick check. You will get a message when it is approved." : "Saved", data: { visibility: set.visibility, communityStatus: set.communityStatus } });
  } catch (error) {
    next(error);
  }
};

const shelfCard = (set, names, courseById) => ({
  id: set._id, title: set.title, description: set.description, topic: set.topic,
  course: courseById.get(String(set.course)) || null,
  author: names.get(String(set.owner)) || "A student",
  studied: set.studiedCount, saved: set.savedCount, approvedAt: set.reviewedAt
});

// STUDENT: the community shelf. ?q= (title, topic, description), ?course=, ?category=, ?topic=, ?sort=new|studied|saved, ?page=.
const shelf = async (req, res, next) => {
  try {
    const filter = { communityStatus: "approved", visibility: "community", deletedAt: null };
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: pattern }, { topic: pattern }, { description: pattern }];
    }
    if (typeof req.query.topic === "string" && req.query.topic.trim()) filter.topic = new RegExp(`^${escapeRegex(req.query.topic.trim().slice(0, 80))}$`, "i");
    if (req.query.course && !badId(req.query.course)) filter.course = req.query.course;
    if (typeof req.query.category === "string" && req.query.category) {
      const wanted = req.query.category.toLowerCase().slice(0, 60);
      const names = (await Course.distinct("category", { deletedAt: null })).filter((name) => name && slugOf(name) === wanted);
      filter.course = { $in: names.length ? await Course.find({ category: { $in: names }, deletedAt: null }).distinct("_id") : [] };
    }
    if (req.query.saved === "1") filter._id = { $in: await SetSave.find({ user: req.user.id }).distinct("set") };
    const sort = req.query.sort === "studied" ? { studiedCount: -1, reviewedAt: -1 } : req.query.sort === "saved" ? { savedCount: -1, reviewedAt: -1 } : { reviewedAt: -1 };
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const [sets, total] = await Promise.all([
      StudySet.find(filter).sort(sort).skip((page - 1) * PAGE).limit(PAGE).lean(),
      StudySet.countDocuments(filter)
    ]);
    const [names, courses] = await Promise.all([
      authorNames(sets.map((set) => set.owner)),
      Course.find({ _id: { $in: sets.map((set) => set.course).filter(Boolean) } }).select("code title").lean()
    ]);
    const courseById = new Map(courses.map((course) => [String(course._id), { id: course._id, code: course.code, title: course.title }]));
    return res.status(200).json({ data: { items: sets.map((set) => shelfCard(set, names, courseById)), page, pages: Math.max(1, Math.ceil(total / PAGE)), total } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: what can be filtered on the shelf: categories, courses and topics that have at least one approved set.
const shelfFilters = async (req, res, next) => {
  try {
    const base = { communityStatus: "approved", visibility: "community", deletedAt: null };
    const [courseIds, topics] = await Promise.all([StudySet.distinct("course", { ...base, course: { $ne: null } }), StudySet.distinct("topic", { ...base, topic: { $ne: "" } })]);
    const courses = await Course.find({ _id: { $in: courseIds } }).select("code title category").sort({ code: 1 }).lean();
    const categories = new Map();
    for (const course of courses) if (course.category && slugOf(course.category)) categories.set(slugOf(course.category), { id: slugOf(course.category), name: course.category });
    return res.status(200).json({
      data: {
        courses: courses.map((course) => ({ id: course._id, code: course.code, title: course.title })),
        categories: [...categories.values()],
        topics: topics.sort((a, b) => a.localeCompare(b)).slice(0, 40)
      }
    });
  } catch (error) {
    next(error);
  }
};

// STUDENT: one shared set, read only: its cards, the notes as plain text and its quizzes. Source material is never included.
const detail = async (req, res, next) => {
  try {
    const set = await findSharedSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const mine = String(set.owner) === String(req.user.id);
    const [cards, note, quizzes, names, saved, course] = await Promise.all([
      Flashcard.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean(),
      SetNote.findOne({ set: set._id }).lean(),
      Test.find({ set: set._id, deletedAt: null, isPublished: true }).sort({ order: 1 }).lean(),
      authorNames([set.owner]),
      SetSave.exists({ user: req.user.id, set: set._id }),
      set.course ? Course.findById(set.course).select("code title").lean() : null
    ]);
    const counts = await Question.aggregate([{ $match: { test: { $in: quizzes.map((quiz) => quiz._id) }, deletedAt: null } }, { $group: { _id: "$test", n: { $sum: 1 } } }]);
    const byTest = new Map(counts.map((row) => [String(row._id), row.n]));
    return res.status(200).json({
      data: {
        id: set._id, title: set.title, description: set.description, topic: set.topic,
        course: course ? { id: course._id, code: course.code, title: course.title } : null,
        author: names.get(String(set.owner)) || "A student", mine,
        visibility: set.visibility, communityStatus: set.communityStatus, onShelf: set.communityStatus === "approved" && set.visibility === "community",
        studied: set.studiedCount, saved: set.savedCount, isSaved: Boolean(saved),
        cards: cards.map((card) => ({ front: card.front?.text || "", back: card.back?.text || "" })),
        notesText: notesToText(note?.content).trim(),
        quizzes: quizzes.map((quiz) => ({ id: quiz._id, title: quiz.title, questionCount: byTest.get(String(quiz._id)) || 0 })).filter((quiz) => quiz.questionCount > 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

const save = async (req, res, next) => {
  try {
    const set = await findSharedSet(req.params.id, req.user.id);
    if (!set || String(set.owner) === String(req.user.id)) return notFound(res);
    const made = await SetSave.updateOne({ user: req.user.id, set: set._id }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    if (made.upsertedCount) await StudySet.updateOne({ _id: set._id }, { $inc: { savedCount: 1 } });
    return res.status(200).json({ data: { isSaved: true } });
  } catch (error) {
    next(error);
  }
};

const unsave = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return notFound(res);
    const gone = await SetSave.deleteOne({ user: req.user.id, set: req.params.id });
    if (gone.deletedCount) await StudySet.updateOne({ _id: req.params.id, savedCount: { $gt: 0 } }, { $inc: { savedCount: -1 } });
    return res.status(200).json({ data: { isSaved: false } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: a private copy in the student's own Lab, to edit freely and review with spaced repetition. Cards, notes and
// quizzes are copied. Source material never is. The copy remembers where it came from but shares nothing back.
const copy = async (req, res, next) => {
  try {
    const source = await findSharedSet(req.params.id, req.user.id);
    if (!source) return notFound(res);
    if ((await StudySet.countDocuments({ owner: req.user.id, deletedAt: null })) >= MAX_SETS) return res.status(409).json({ message: `You can keep up to ${MAX_SETS} study sets. Delete one first.` });
    const made = await StudySet.create({
      owner: req.user.id, title: `${source.title} (copy)`.slice(0, 80), description: source.description, topic: source.topic,
      course: source.course, visibility: "private", copiedFrom: source._id
    });
    const [cards, note, tests] = await Promise.all([
      Flashcard.find({ set: source._id, deletedAt: null }).sort({ order: 1 }).lean(),
      SetNote.findOne({ set: source._id }).lean(),
      Test.find({ set: source._id, deletedAt: null, isPublished: true }).sort({ order: 1 }).lean()
    ]);
    if (cards.length) await Flashcard.insertMany(cards.map((card, index) => ({ set: made._id, front: { text: card.front?.text }, back: { text: card.back?.text }, order: index + 1, isPublished: true })));
    if (note?.content) await SetNote.create({ set: made._id, content: note.content });
    for (const test of tests) {
      const newTest = await Test.create({ scope: "set", set: made._id, title: test.title, isPublished: true });
      const questions = await Question.find({ test: test._id, deletedAt: null, type: { $in: ["mcq", "true_false"] } }).sort({ order: 1 }).lean();
      for (const [index, question] of questions.entries()) {
        const doc = new Question({ test: newTest._id, type: question.type, text: question.text, order: index + 1, explanation: question.explanation || "" });
        if (question.type === "mcq") {
          doc.options = question.options.map((option) => ({ text: option.text }));
          const at = question.options.findIndex((option) => String(option._id) === String(question.correctOption));
          doc.correctOption = doc.options[Math.max(0, at)]._id;
        } else {
          doc.correctAnswer = question.correctAnswer;
        }
        await doc.save();
      }
    }
    await StudySet.updateOne({ _id: source._id }, { $inc: { copyCount: 1 } });
    logEvent(req.user.id, "set_created", { set: made._id });
    return res.status(201).json({ message: "Copied to your Study Lab", data: { id: made._id } });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

// STUDENT: "I am studying this set" (opening its cards or starting its quiz). Counts once per student per day, never for the
// owner. It adds to "times studied", gives the owner a little XP once per student, and feeds the weekly and monthly boards.
const studied = async (req, res, next) => {
  try {
    const set = await findSharedSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if (String(set.owner) === String(req.user.id) || set.communityStatus !== "approved") return res.status(204).end();
    const made = await SetStudy.updateOne({ set: set._id, user: req.user.id, day: utcDay() }, { $setOnInsert: { owner: set.owner } }, { upsert: true });
    if (made.upsertedCount) {
      await StudySet.updateOne({ _id: set._id }, { $inc: { studiedCount: 1 } });
      logEvent(req.user.id, "set_studied", { set: set._id });
      await awardXp(set.owner, "set_used", { key: `${set._id}:${req.user.id}` });
    }
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { setVisibility, shelf, shelfFilters, detail, save, unsave, copy, studied, itemCount, MIN_ITEMS };
