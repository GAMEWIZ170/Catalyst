const mongoose = require("mongoose");
const SetMaterial = require("../models/setmaterial.models");
const SetNote = require("../models/setnote.models");
const ExamAttempt = require("../models/examattempt.models");
const Report = require("../models/report.models");
const User = require("../models/user.models");
const { findVisibleLesson } = require("../utils/visibility");
const { findOwnSet } = require("../utils/ownSet");
const { complete, AiError } = require("../utils/ai");
const quota = require("../utils/aiQuota");
const { pickExcerpts, systemPrompt, cleanHistory, givesAnswer, citedNumbers, STRICTER } = require("../utils/companion");
const { notesToText } = require("./aigenerate.controller");
const { logEvent } = require("../utils/events");

const LABEL = "Free beta, fair-use limits apply.";

// What the student sees when the AI cannot help, and the status that goes with it.
const PROBLEMS = {
  not_configured: [503, "AI is not set up yet."],
  capacity: [503, "AI is resting until tomorrow. Please try again then."],
  timeout: [504, "The AI took too long. Please try again."],
  too_long: [413, "That message is too long. Please shorten it."],
  provider: [502, "The AI could not be reached. Please try again in a moment."],
  bad_request: [400, "That request could not be made."]
};

// STUDENT: how much AI is left today, for the screens.
const getStatus = async (req, res, next) => {
  try {
    const { isConfigured } = require("../utils/ai");
    return res.status(200).json({ data: { ...(await quota.status(req.user.id)), configured: isConfigured(), label: LABEL } });
  } catch (error) {
    next(error);
  }
};

// The text the companion may use for a lesson or a set, as labelled sources. Null when the student may not use it.
const sourcesFor = async (context, userId) => {
  if (context.kind === "lesson") {
    const lesson = await findVisibleLesson(context.id);
    if (!lesson) return null;
    return { title: lesson.title, sources: [{ label: `Lesson "${lesson.title}"`, text: `${lesson.title}\n\n${lesson.explanation}`, link: `/lessons/${lesson._id}` }] };
  }
  const set = await findOwnSet(context.id, userId);
  if (!set) return null;
  const [note, materials] = await Promise.all([
    SetNote.findOne({ set: set._id }).lean(),
    SetMaterial.find({ set: set._id, owner: userId }).select("title text").limit(20).lean()
  ]);
  const link = `/lab/${set._id}?tab=notes`;
  const sources = [];
  const notesText = notesToText(note?.content);
  if (notesText.trim()) sources.push({ label: `Set "${set.title}" › Notes`, text: notesText, link });
  for (const material of materials) if (material.text) sources.push({ label: `Set "${set.title}" › ${material.title}`, text: material.text.slice(0, 100000), link });
  return { title: set.title, sources };
};

// STUDENT: one companion message. The browser sends the last few turns (nothing is stored on the server), and the reply
// comes with the excerpts it was built from, so every answer can be checked. Off while a timed quiz or exam is running.
const chat = async (req, res, next) => {
  let reserved = false;
  try {
    const { context, messages } = req.body;
    if (await ExamAttempt.exists({ user: req.user.id, submittedAt: null, endsAt: { $gt: new Date() } })) {
      return res.status(409).json({ message: "The study companion is off while a timed quiz or mock exam is running.", code: "exam_running" });
    }
    const found = await sourcesFor(context, req.user.id);
    if (!found) return res.status(404).json({ message: context.kind === "lesson" ? "Lesson not found" : "Study set not found" });
    const hasText = found.sources.some((source) => source.text.trim().length >= 40);
    if (!hasText) return res.status(400).json({ message: "There is nothing in this set yet for the companion to read. Add notes or material first." });

    const asked = cleanHistory(messages);
    const recent = asked.filter((message) => message.role === "user").slice(-2).map((message) => message.content).join(" ");
    const excerpts = pickExcerpts(found.sources, recent);

    const slot = await quota.reserve(req.user.id, "message");
    if (!slot.ok) {
      return res.status(429).json({ message: slot.reason === "resting" ? "AI is resting until tomorrow. Please try again then." : "You have used today's AI messages. They come back tomorrow.", code: slot.reason === "resting" ? "resting" : "daily_limit" });
    }
    reserved = true;

    const me = await User.findById(req.user.id).select("name displayName").lean();
    const names = [me?.name, me?.displayName];
    const base = [{ role: "system", content: systemPrompt(excerpts) }, ...asked];
    let out = await complete({ messages: base, temperature: 0.3, maxTokens: 350, names });
    let tokens = { inputTokens: out.usage.inputTokens, outputTokens: out.usage.outputTokens };
    if (givesAnswer(out.text)) {
      // One more try, with the rule restated. The retry is what the student sees.
      out = await complete({ messages: [...base, { role: "assistant", content: out.text }, { role: "user", content: STRICTER }], temperature: 0.2, maxTokens: 350, names });
      tokens = { inputTokens: tokens.inputTokens + out.usage.inputTokens, outputTokens: tokens.outputTokens + out.usage.outputTokens };
    }
    await quota.addTokens(req.user.id, tokens);
    logEvent(req.user.id, "ai_message", { kind: context.kind, input: tokens.inputTokens, output: tokens.outputTokens });

    const cited = citedNumbers(out.text);
    const state = await quota.status(req.user.id);
    return res.status(200).json({
      data: {
        reply: out.text,
        sources: excerpts.map((excerpt) => ({ n: excerpt.n, label: excerpt.label, link: excerpt.link, cited: cited.has(excerpt.n) })),
        messagesLeft: state.messagesLeft,
        note: "AI can make mistakes. Check with your lesson."
      }
    });
  } catch (error) {
    if (reserved) await quota.release(req.user.id, "message").catch(() => {});
    if (error instanceof AiError && PROBLEMS[error.code]) {
      if (error.code === "capacity") await quota.markResting().catch(() => {});
      const [status, message] = PROBLEMS[error.code];
      return res.status(status).json({ message, code: error.code });
    }
    next(error);
  }
};

// STUDENT: flag a companion answer. It lands in the same inbox as other reports, with the question and the answer kept,
// because the companion keeps no history of its own.
const flag = async (req, res, next) => {
  try {
    const { context, question, answer, category, note } = req.body;
    let title = "";
    let link = "";
    if (context.kind === "lesson") {
      const lesson = await findVisibleLesson(context.id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      title = `AI answer about "${lesson.title}"`;
      link = `/lessons/${lesson._id}`;
    } else {
      const set = await findOwnSet(context.id, req.user.id);
      if (!set) return res.status(404).json({ message: "Study set not found" });
      title = `AI answer in set "${set.title}"`;
      link = `/lab/${set._id}`;
    }
    await Report.create({ user: req.user.id, kind: "ai", target: new mongoose.Types.ObjectId(context.id), category, note: note || "", title: title.slice(0, 200), link, aiQuestion: question, aiAnswer: answer });
    return res.status(201).json({ message: "Thank you. We will check this answer." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStatus, chat, flag, PROBLEMS, LABEL };
