const StudySet = require("./studyset.models");
const SetMaterial = require("./setmaterial.models");
const SetUnit = require("./setunit.models");
const SetLesson = require("./setlesson.models");
const AiDraft = require("./aidraft.models");
const Flashcard = require("../flashcards/flashcard.models");
const Test = require("../assessments/test.models");
const Question = require("../assessments/question.models");
const User = require("../auth/user.models");
const cloudinary = require("../../config/cloudinary");
const { defaultModel } = require("../../config/ai");
const { findOwnSet } = require("../../utils/ownSet");
const { AiError } = require("../../utils/ai");
const { hashOf, toChunks, draftOutline, draftLesson, sectionsToDoc, sourceKey } = require("../../utils/aiDrafts");
const { logEvent } = require("../../utils/events");
const quota = require("../../utils/aiQuota");
const { storePdfMaterial, storeTextMaterial } = require("./setmaterial.controller");

// One-shot build (study companion). One request makes a set from a PDF, pasted text or just a topic name, answers at once,
// and the AI then works in the background in two steps:
//   1. the outline: the set's title, its units and their lesson titles (the units and empty lessons are saved right away)
//   2. one lesson at a time: notes, flashcards and quiz questions, saved straight into the set
// The student can leave the page. GET /study-sets/:id/build shows the progress, one line per lesson.
// A build uses ONE of the student's daily builds, however many lessons it has. It is given back if nothing could be made.
// What the AI wrote is ordinary set content afterwards: the student edits or deletes it through the normal routes.

const MAX_SETS = 100;
const STALE_MS = 5 * 60 * 1000; // a build that has not moved in 5 minutes (for example after a restart) counts as an issue
const MIN_TEXT = 400;           // a PDF with less readable text than this is treated as a scan: the model reads the file itself
const FINAL_TEST = "Final test";

// What the student reads when a step could not be made. Short and calm.
const problemText = (error) => {
  if (error?.code === "daily_limit") return "You have used today's set builds. They come back tomorrow.";
  if (error?.code === "resting") return "AI is resting until tomorrow. Please try again then.";
  if (error?.code === "no_source") return "The material for this set could not be read. Please add it again.";
  if (error instanceof AiError) {
    return {
      not_configured: "AI is not set up yet.",
      capacity: "AI is resting until tomorrow. Please try again then.",
      busy: "The AI is busy. Please try again in a minute.",
      timeout: "The AI took too long.",
      too_long: "That text is too long for one go.",
      bad_output: "The AI answer could not be used.",
      provider: "The AI could not be reached."
    }[error.code] || "The AI could not help this time.";
  }
  return "Something went wrong while making your set.";
};

// Stopping early saves calls when the rest would fail for the same reason.
const stopsBuild = (error) => ["daily_limit", "resting", "no_source"].includes(error?.code) || (error instanceof AiError && ["capacity", "not_configured"].includes(error.code));

const publicProgress = (progress) => {
  const lessons = Array.isArray(progress?.lessons) ? progress.lessons : null;
  if (!lessons) return null;
  return {
    total: lessons.length,
    done: lessons.filter((lesson) => lesson.status === "done").length,
    failed: lessons.filter((lesson) => lesson.status === "failed").length,
    lessons: lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, status: lesson.status })),
    finishedAt: progress.finishedAt || null
  };
};

// status: none (nothing running), processing (the AI is working), issue (nothing could be made), ready (older sets only:
// drafts wait for review). After a finished build the status is "none" and progress.finishedAt is set.
const buildOf = (set) => {
  const build = set.build || {};
  const progress = publicProgress(build.progress);
  const moved = build.touchedAt || build.startedAt;
  const stale = build.status === "processing" && moved && Date.now() - new Date(moved).getTime() > STALE_MS;
  if (stale) return { status: "issue", message: "This took too long. You can try again.", progress };
  return { status: build.status || "none", message: build.message || "", progress };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One AI step with its cache, the platform cap and a short wait when the provider says "busy" (a per-minute limit).
// Returns the checked result. Throws an Error with .code on a quota problem, or an AiError.
const aiStep = async (userId, kind, key, run) => {
  const hash = hashOf(kind, key);
  const saved = await AiDraft.findOne({ owner: userId, kind, hash }).select("result").lean();
  if (saved) return saved.result;
  if (await quota.platformResting()) throw Object.assign(new Error("quota"), { code: "resting" });
  let out;
  for (let attempt = 0; ; attempt++) {
    try {
      out = await run();
      break;
    } catch (error) {
      if (error instanceof AiError && error.code === "capacity") await quota.markResting().catch(() => {});
      if (!(error instanceof AiError) || error.code !== "busy" || attempt >= 2) throw error;
      await sleep(Math.min(error.retryAfterMs || 5000, 30000));
    }
  }
  await quota.addTokens(userId, out.usage);
  const result = kind === "outline" ? out.outline : out.lesson;
  await AiDraft.updateOne({ owner: userId, kind, hash }, { $setOnInsert: { result, model: out.model, createdAt: new Date() } }, { upsert: true })
    .catch((error) => { if (error.code !== 11000) throw error; });
  logEvent(userId, "ai_generated", { kind, input: out.usage.inputTokens, output: out.usage.outputTokens });
  return result;
};

// A private PDF back from storage, for trying a scan again after the upload request is gone. null when it cannot be fetched.
const downloadPdf = async (publicId) => {
  try {
    const url = cloudinary.utils.private_download_url(publicId, "", { resource_type: "raw", type: "private", expires_at: Math.floor(Date.now() / 1000) + 300 });
    const response = await fetch(url);
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
};

// What the AI works from: the topic, the text of the set's first material, or the PDF itself when it has almost no text.
const sourceFor = async (set, userId, file) => {
  const info = set.build?.source || {};
  if (info.kind === "topic" && info.topic) return { kind: "topic", topic: info.topic };
  const material = await SetMaterial.findOne({ set: set._id, owner: userId }).sort({ createdAt: 1 }).lean();
  if (!material) return null;
  const text = (material.text || "").trim();
  if (material.kind === "pdf" && text.length < MIN_TEXT && defaultModel().files) {
    const data = file || (material.publicId ? await downloadPdf(material.publicId) : null);
    if (data) return { kind: "file", file: { mimeType: "application/pdf", data } };
  }
  return text.length >= 20 ? { kind: "text", text } : null;
};

// The quiz of a unit (or the whole-set test when unit is null), made the first time the build has a question for it.
const quizFor = async (setId, unit) => {
  const found = await Test.findOne({ set: setId, setUnit: unit ? unit._id : null, deletedAt: null }).sort({ order: 1 });
  if (found) return found;
  return Test.create({ scope: "set", set: setId, setUnit: unit ? unit._id : null, title: unit ? `${unit.title.slice(0, 70)} quiz` : FINAL_TEST, isPublished: true });
};

const addQuestions = async (test, questions) => {
  let order = (await Question.countDocuments({ test: test._id })) + 1;
  for (const item of questions) {
    const type = item.type || "mcq";
    const doc = new Question({ test: test._id, type, text: item.text, order: order++, explanation: item.explanation || "" });
    if (type === "fill_blank") doc.acceptedAnswers = item.answers;
    else if (type === "short_answer") { doc.modelAnswer = item.modelAnswer; doc.keyPoints = item.keyPoints; }
    else {
      doc.options = item.options.map((text) => ({ text }));
      doc.correctOption = doc.options[item.correctIndex]._id;
    }
    await doc.save();
  }
};

// Saves one written lesson: its notes, its flashcards, and its questions. Most questions go to the unit's quiz; the last
// one of a lesson goes to the whole-set test, so that test is made of questions the unit quizzes did not already ask.
const saveLesson = async (setId, lesson, unit, result) => {
  await SetLesson.updateOne({ _id: lesson._id }, { $set: { content: sectionsToDoc(result.sections) } });
  if (result.cards.length) {
    let order = ((await Flashcard.findOne({ set: setId, deletedAt: null }).sort({ order: -1 }).select("order").lean())?.order || 0) + 1;
    await Flashcard.insertMany(result.cards.map((card) => ({ set: setId, setLesson: lesson._id, front: { text: card.front }, back: { text: card.back }, order: order++, isPublished: true })));
  }
  const forSet = result.questions.length >= 3 ? result.questions.slice(-1) : [];
  const forUnit = result.questions.slice(0, result.questions.length - forSet.length);
  if (forUnit.length) await addQuestions(await quizFor(setId, unit), forUnit);
  if (forSet.length) await addQuestions(await quizFor(setId, null), forSet);
};

// The text a lesson is written from: the chunks the outline named, or (when it named none) the part of the text at the
// lesson's place in the course, so the first lesson reads the start and the last one reads the end.
const lessonText = (chunks, wanted, index, total) => {
  const named = (wanted || []).filter((n) => Number.isInteger(n) && n >= 1 && n <= chunks.length);
  if (named.length) return named.map((n) => chunks[n - 1]).join("\n\n");
  const at = Math.min(chunks.length - 1, Math.floor((index * chunks.length) / Math.max(1, total)));
  return chunks.slice(at, at + 2).join("\n\n");
};

// Runs in the background. Never throws: it always leaves the set finished ("none", with progress) or in "issue".
// `file` is the uploaded PDF while the upload request is still in memory. `reserved` says a daily build was counted for this run.
const runBuild = async (setId, userId, { file = null, reserved = false } = {}) => {
  const active = { _id: setId, deletedAt: null, "build.status": "processing" };
  let plan = [];
  try {
    const set = await StudySet.findOne(active);
    if (!set) return; // deleted, or the student already chose to start empty
    const me = await User.findById(userId).select("name displayName").lean();
    const names = [me?.name, me?.displayName];
    const source = await sourceFor(set, userId, file);
    if (!source) throw Object.assign(new Error("source"), { code: "no_source" });
    const chunks = source.kind === "text" ? toChunks(source.text) : [];
    let title = set.title;

    // Step 1: the outline. Skipped on a retry of a set whose units are already there.
    if (!(await SetUnit.exists({ set: setId, deletedAt: null }))) {
      const outline = await aiStep(userId, "outline", sourceKey(source), () => draftOutline(source, names));
      for (const [at, unit] of outline.units.entries()) {
        const made = await SetUnit.create({ set: setId, title: unit.title, order: at + 1 });
        await SetLesson.insertMany(unit.lessons.map((lesson, index) => ({ set: setId, unit: made._id, title: lesson.title, order: index + 1, brief: { focus: lesson.focus, chunks: lesson.chunks } })));
      }
      const named = {};
      if (outline.title) named.title = outline.title;
      if (outline.topic && !set.topic) named.topic = outline.topic;
      if (Object.keys(named).length) await StudySet.updateOne({ _id: setId }, { $set: named });
      title = named.title || title;
    }

    // Every lesson the AI planned, in course order. The ones without notes yet are the work to do.
    const units = await SetUnit.find({ set: setId, deletedAt: null }).sort({ order: 1 }).lean();
    const unitById = new Map(units.map((unit) => [String(unit._id), unit]));
    const lessons = (await SetLesson.find({ set: setId, deletedAt: null, brief: { $ne: null } }).sort({ order: 1 }).lean())
      .filter((lesson) => unitById.has(String(lesson.unit)))
      .sort((a, b) => unitById.get(String(a.unit)).order - unitById.get(String(b.unit)).order || a.order - b.order);
    plan = lessons.map((lesson) => ({ id: lesson._id, title: lesson.title, status: lesson.content ? "done" : "pending" }));
    const saveProgress = (extra = {}) => StudySet.updateOne(active, { $set: { "build.progress": { lessons: plan }, "build.touchedAt": new Date(), ...extra } });
    await saveProgress();

    // Step 2: one lesson at a time.
    const reasons = [];
    for (const [index, lesson] of lessons.entries()) {
      if (plan[index].status === "done") continue;
      if (!(await StudySet.exists(active))) return; // the student deleted the set or stopped the build
      const unit = unitById.get(String(lesson.unit));
      const own = source.kind === "text" ? { kind: "text", text: lessonText(chunks, lesson.brief.chunks, index, lessons.length) } : source;
      const brief = { course: title, unit: unit.title, title: lesson.title, focus: lesson.brief.focus || "", others: lessons.filter((other) => other !== lesson).map((other) => other.title) };
      try {
        const result = await aiStep(userId, "lesson", `${brief.course}\n${brief.unit}\n${brief.title}\n${brief.focus}\n${sourceKey(own)}`, () => draftLesson(own, brief, names));
        await saveLesson(setId, lesson, unit, result);
        plan[index].status = "done";
      } catch (error) {
        plan[index].status = "failed";
        reasons.push(problemText(error));
        if (stopsBuild(error)) {
          for (const row of plan) if (row.status === "pending") row.status = "failed";
          break;
        }
      }
      await saveProgress();
    }

    const done = plan.filter((row) => row.status === "done").length;
    const failed = plan.length - done;
    const why = [...new Set(reasons)].join(" ");
    if (!done) {
      if (reserved) await quota.release(userId, "build").catch(() => {});
      await StudySet.updateOne(active, { $set: { "build.status": "issue", "build.message": (why || "The AI could not help this time.").slice(0, 300), "build.progress": { lessons: plan }, "build.touchedAt": new Date() } });
      return;
    }
    const message = failed ? `${failed} of ${plan.length} lessons could not be written. ${why}`.slice(0, 300) : "";
    await StudySet.updateOne(active, { $set: { "build.status": "none", "build.message": message, "build.drafts": null, "build.progress": { lessons: plan, finishedAt: new Date() }, "build.touchedAt": new Date() } });
  } catch (error) {
    if (reserved) await quota.release(userId, "build").catch(() => {});
    await StudySet.updateOne(active, { $set: { "build.status": "issue", "build.message": problemText(error), "build.drafts": null, "build.progress": plan.length ? { lessons: plan } : null } }).catch(() => {});
  }
};

const firstLine = (text) => String(text).trim().split(/\r?\n/)[0].replace(/\s+/g, " ").slice(0, 60) || "Untitled set";

// STUDENT: makes a set from a PDF (multipart, field "file"), pasted text (JSON {text}) or a topic name (JSON {topic}),
// then starts the AI. Answers 202 at once.
const startBuild = async (req, res, next) => {
  let reserved = false;
  let set = null;
  try {
    if ((await StudySet.countDocuments({ owner: req.user.id, deletedAt: null })) >= MAX_SETS) return res.status(409).json({ message: `You can keep up to ${MAX_SETS} study sets. Delete one first.` });
    const isPdf = Boolean(req.file);
    const topic = !isPdf && req.body.topic ? req.body.topic : "";
    const slot = await quota.reserve(req.user.id, "build");
    if (!slot.ok) {
      const code = slot.reason === "resting" ? "resting" : "daily_limit";
      return res.status(429).json({ message: problemText({ code }), code });
    }
    reserved = true;
    const now = new Date();
    set = await StudySet.create({
      owner: req.user.id, title: topic ? topic.slice(0, 80) : "Untitled set", topic: topic ? topic.slice(0, 80) : "", visibility: "private",
      build: { status: "processing", startedAt: now, touchedAt: now, source: { kind: isPdf ? "pdf" : topic ? "topic" : "text", topic } }
    });
    if (!topic) {
      try {
        const material = isPdf
          ? await storePdfMaterial(set, req.user.id, req.file, "", { allowScan: Boolean(defaultModel().files) })
          : await storeTextMaterial(set, req.user.id, firstLine(req.body.text), req.body.text);
        if (set.title === "Untitled set" && material.title) await StudySet.updateOne({ _id: set._id }, { $set: { title: material.title.slice(0, 60) } });
      } catch (error) {
        await set.deleteOne(); // nothing was made, so nothing is left behind
        await quota.release(req.user.id, "build").catch(() => {});
        if (error.status === 502) return next(error);
        if (error.status) return res.status(error.status).json({ message: error.message });
        throw error;
      }
    }
    logEvent(req.user.id, "set_created", { set: set._id });
    runBuild(set._id, req.user.id, { file: isPdf ? req.file.buffer : null, reserved: true }).catch(() => {});
    return res.status(202).json({ message: "Your set is being made", data: { id: set._id, title: set.title, build: buildOf(set) } });
  } catch (error) {
    if (reserved && !set) await quota.release(req.user.id, "build").catch(() => {});
    next(error);
  }
};

// STUDENT: where the build is: its status, a calm message, and one line per lesson (pending, done or failed).
const getBuild = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ message: "Study set not found" });
    const build = buildOf(set);
    return res.status(200).json({ data: { ...build, title: set.title, topic: set.topic, drafts: build.status === "ready" ? set.build.drafts : null } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: try again. After an issue the whole build runs again (and uses a daily build again, since the failed one was
// given back). After a build that finished with some failed lessons, only those lessons are written, at no extra build.
const retryBuild = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ message: "Study set not found" });
    const build = buildOf(set);
    const partial = build.status === "none" && Boolean(build.progress?.failed);
    if (build.status !== "issue" && !partial) return res.status(409).json({ message: "There is nothing to try again." });
    const isTopic = set.build?.source?.kind === "topic";
    if (!isTopic && !(await SetMaterial.exists({ set: set._id, owner: req.user.id }))) return res.status(409).json({ message: "This set has no material to work from." });
    let reserved = false;
    if (!partial) {
      const slot = await quota.reserve(req.user.id, "build");
      if (!slot.ok) {
        const code = slot.reason === "resting" ? "resting" : "daily_limit";
        return res.status(429).json({ message: problemText({ code }), code });
      }
      reserved = true;
    }
    const now = new Date();
    set.build = { status: "processing", message: "", startedAt: now, touchedAt: now, drafts: null, source: set.build?.source || null, progress: set.build?.progress || null };
    set.markModified("build");
    await set.save();
    runBuild(set._id, req.user.id, { reserved }).catch(() => {});
    return res.status(202).json({ message: "Trying again", data: { id: set._id, build: buildOf(set) } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: "start empty", or stop a build that is running. What was already written stays in the set.
const finishBuild = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ message: "Study set not found" });
    set.build = { status: "none", message: "", startedAt: null, touchedAt: null, drafts: null, source: set.build?.source || null, progress: null };
    set.markModified("build");
    await set.save();
    return res.status(200).json({ message: "Done", data: { id: set._id, build: buildOf(set) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { startBuild, getBuild, retryBuild, finishBuild, buildOf, runBuild };
