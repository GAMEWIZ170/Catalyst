const StudySet = require("./studyset.models");
const SetMaterial = require("./setmaterial.models");
const AiDraft = require("./aidraft.models");
const User = require("../auth/user.models");
const { findOwnSet } = require("../../utils/ownSet");
const { AiError } = require("../../utils/ai");
const { slicePart, draftFrom, draftTitledCards, hashOf } = require("../../utils/aiDrafts");
const { logEvent } = require("../../utils/events");
const quota = require("../../utils/aiQuota");
const { storePdfMaterial, storeTextMaterial } = require("./setmaterial.controller");

// "Drop in your notes" (UI polish step 2). One request makes a set, stores the PDF or pasted text as its first material and
// starts the AI in the background: cards (with the set's name), quiz questions and notes. The student can leave the page.
// Drafts wait on the set until the student reviews them. Nothing is saved to the set's cards, quizzes or notes by the AI.
// Each kind uses one of the student's daily AI generations (a repeat of the same text is answered from the draft cache).

const MAX_SETS = 100;
const STALE_MS = 5 * 60 * 1000; // a build that has not finished in 5 minutes (for example after a restart) counts as an issue
const KIND_NAME = { cards: "flashcards", questions: "quiz questions", notes: "notes" };

// What the student reads when a step could not be made. Short and calm.
const problemText = (error) => {
  if (error?.code === "daily_limit") return "You have used today's AI drafts. They come back tomorrow.";
  if (error?.code === "resting") return "AI is resting until tomorrow. Please try again then.";
  if (error instanceof AiError) {
    return {
      not_configured: "AI is not set up yet.",
      capacity: "AI is resting until tomorrow. Please try again then.",
      timeout: "The AI took too long.",
      too_long: "That text is too long for one go.",
      bad_output: "The AI answer could not be used.",
      provider: "The AI could not be reached."
    }[error.code] || "The AI could not help this time.";
  }
  return "Something went wrong while making drafts.";
};

const buildOf = (set) => {
  const build = set.build || {};
  const stale = build.status === "processing" && build.startedAt && Date.now() - new Date(build.startedAt).getTime() > STALE_MS;
  if (stale) return { status: "issue", message: "This took too long. You can try again or start empty." };
  return { status: build.status || "none", message: build.message || "" };
};

// One AI step with its quota and cache. Throws an Error with .code on quota problems, or an AiError.
const step = async (userId, kind, text, run) => {
  const hash = hashOf(kind, text);
  if (kind !== "titled") {
    const saved = await AiDraft.findOne({ owner: userId, kind, hash }).select("result").lean();
    if (saved) return { drafts: saved.result };
  }
  const slot = await quota.reserve(userId, "generation");
  if (!slot.ok) throw Object.assign(new Error("quota"), { code: slot.reason === "resting" ? "resting" : "daily_limit" });
  try {
    const out = await run();
    await quota.addTokens(userId, out.usage);
    if (kind !== "titled") {
      await AiDraft.updateOne({ owner: userId, kind, hash }, { $setOnInsert: { result: out.drafts, model: out.model, createdAt: new Date() } }, { upsert: true })
        .catch((error) => { if (error.code !== 11000) throw error; });
    }
    logEvent(userId, "ai_generated", { kind, input: out.usage.inputTokens, output: out.usage.outputTokens });
    return out;
  } catch (error) {
    await quota.release(userId, "generation").catch(() => {});
    if (error instanceof AiError && error.code === "capacity") await quota.markResting().catch(() => {});
    throw error;
  }
};

// Runs in the background. Never throws: it always leaves the set in "ready" or "issue".
const runBuild = async (setId, userId, fullText, fallbackTitle) => {
  const drafts = {};
  const problems = [];
  const reasons = [];
  try {
    const me = await User.findById(userId).select("name displayName").lean();
    const names = [me?.name, me?.displayName];
    const text = slicePart(fullText, 0).text;
    let title = null;
    let topic = "";

    try {
      const out = await step(userId, "titled", text, () => draftTitledCards(text, names));
      drafts.cards = out.drafts;
      title = out.title || null;
      topic = out.topic || "";
    } catch (error) {
      problems.push(`${KIND_NAME.cards}: ${problemText(error)}`);
      reasons.push(problemText(error));
      if (error.code === "daily_limit" || error.code === "resting") throw error; // no point asking again for the rest
    }
    for (const kind of ["questions", "notes"]) {
      try {
        const out = await step(userId, kind, text, () => draftFrom(kind, text, names));
        drafts[kind] = out.drafts;
      } catch (error) {
        problems.push(`${KIND_NAME[kind]}: ${problemText(error)}`);
        reasons.push(problemText(error));
        if (error.code === "daily_limit" || error.code === "resting") break;
      }
    }

    const got = Object.keys(drafts);
    const set = await StudySet.findOne({ _id: setId, deletedAt: null });
    if (!set || set.build.status !== "processing") return; // deleted, or the student already started empty
    if (title) set.title = title;
    else if (set.title === "Untitled set") set.title = fallbackTitle;
    if (topic && !set.topic) set.topic = topic;
    if (got.length) {
      set.build = { status: "ready", message: problems.length ? `Some drafts could not be made. ${problems.join(" ")}` : "", startedAt: set.build.startedAt, drafts };
    } else {
      set.build = { status: "issue", message: [...new Set(reasons)].join(" ") || "The AI could not help this time.", startedAt: set.build.startedAt, drafts: null };
    }
    set.markModified("build");
    await set.save();
  } catch (error) {
    const message = problemText(error);
    await StudySet.updateOne({ _id: setId, deletedAt: null, "build.status": "processing" }, { $set: { "build.status": "issue", "build.message": message, "build.drafts": null } }).catch(() => {});
  }
};

const firstLine = (text) => String(text).trim().split(/\r?\n/)[0].replace(/\s+/g, " ").slice(0, 60) || "Untitled set";

// STUDENT: makes a set from a PDF (multipart, field "file") or pasted text (JSON {text}), then starts the AI. Answers 202 at once.
const startBuild = async (req, res, next) => {
  try {
    if ((await StudySet.countDocuments({ owner: req.user.id, deletedAt: null })) >= MAX_SETS) return res.status(409).json({ message: `You can keep up to ${MAX_SETS} study sets. Delete one first.` });
    const isPdf = Boolean(req.file);
    const set = await StudySet.create({ owner: req.user.id, title: "Untitled set", visibility: "private", build: { status: "processing", startedAt: new Date() } });
    let material;
    try {
      material = isPdf
        ? await storePdfMaterial(set, req.user.id, req.file, "")
        : await storeTextMaterial(set, req.user.id, firstLine(req.body.text), req.body.text);
    } catch (error) {
      await set.deleteOne(); // nothing was made, so nothing is left behind
      if (error.status === 502) return next(error);
      if (error.status) return res.status(error.status).json({ message: error.message });
      throw error;
    }
    logEvent(req.user.id, "set_created", { set: set._id });
    runBuild(set._id, req.user.id, material.text, material.title.slice(0, 60) || "Untitled set").catch(() => {});
    return res.status(202).json({ message: "Your set is being made", data: { id: set._id, title: set.title, build: buildOf(set) } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: where the build is, and the drafts when they are ready.
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

// STUDENT: try again from the set's first material (after an issue).
const retryBuild = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ message: "Study set not found" });
    if (buildOf(set).status !== "issue") return res.status(409).json({ message: "There is nothing to try again." });
    const material = await SetMaterial.findOne({ set: set._id, owner: req.user.id }).sort({ createdAt: 1 }).lean();
    if (!material) return res.status(409).json({ message: "This set has no material to work from." });
    set.build = { status: "processing", message: "", startedAt: new Date(), drafts: null };
    set.markModified("build");
    await set.save();
    runBuild(set._id, req.user.id, material.text, set.title).catch(() => {});
    return res.status(202).json({ message: "Trying again", data: { id: set._id, build: buildOf(set) } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: done reviewing (saved or discarded) or "start empty". Clears the drafts and the status.
const finishBuild = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ message: "Study set not found" });
    set.build = { status: "none", message: "", startedAt: null, drafts: null };
    set.markModified("build");
    await set.save();
    return res.status(200).json({ message: "Done", data: { id: set._id, build: buildOf(set) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { startBuild, getBuild, retryBuild, finishBuild, buildOf };
