const mongoose = require("mongoose");
const SetMaterial = require("./setmaterial.models");
const SetNote = require("./setnote.models");
const ExamAttempt = require("../assessments/examattempt.models");
const Report = require("../community/report.models");
const User = require("../auth/user.models");
const { findVisibleLesson, findVisibleTest } = require("../../utils/visibility");
const Question = require("../assessments/question.models");
const TestResult = require("../assessments/testresult.models");
const Event = require("../progress/event.models");
const { correctAnswerOf } = require("../../utils/grading");
const { findOwnSet } = require("../../utils/ownSet");
const { complete, AiError } = require("../../utils/ai");
const quota = require("../../utils/aiQuota");
const { pickExcerpts, systemPrompt, cleanHistory, givesAnswer, citedNumbers, STRICTER } = require("../../utils/companion");
const { notesToText, lessonTexts } = require("./aigenerate.controller");
const { logEvent } = require("../../utils/events");

const LABEL = "Free beta, fair-use limits apply.";

// What the student sees when the AI cannot help, and the status that goes with it.
const PROBLEMS = {
  not_configured: [503, "AI is not set up yet."],
  capacity: [503, "AI is resting until tomorrow. Please try again then."],
  busy: [503, "The AI is busy. Please try again in a minute."],
  timeout: [504, "The AI took too long. Please try again."],
  too_long: [413, "That message is too long. Please shorten it."],
  provider: [502, "The AI could not be reached. Please try again in a moment."],
  bad_request: [400, "That request could not be made."]
};

// STUDENT: how much AI is left today, for the screens.
const getStatus = async (req, res, next) => {
  try {
    const { isConfigured } = require("../../utils/ai");
    return res.status(200).json({ data: { ...(await quota.status(req.user.id)), configured: isConfigured(), label: LABEL } });
  } catch (error) {
    next(error);
  }
};

// A question the student may ask the tutor about: one they can see and have ALREADY answered (checked on its own, or
// handed in as part of a test). Before that, the answer must stay hidden, so the tutor never gets it. Null otherwise.
const answeredQuestion = async (id, userId) => {
  const question = await Question.findOne({ _id: id, deletedAt: null }).lean();
  if (!question || !(await findVisibleTest(question.test, userId))) return null;
  const answered = await Event.exists({ user: userId, type: "question_answered", "props.question": String(question._id) })
    || await TestResult.exists({ user: userId, test: question.test, attempts: { $gt: 0 } });
  return answered ? question : null;
};

// The reviewed question as plain text for the tutor: the question, the options, the right answer and the explanation.
const questionText = (question) => {
  const right = correctAnswerOf(question);
  const answer = {
    mcq: () => right?.text,
    true_false: () => (right === "true" ? "True" : "False"),
    multi_select: () => right.map((option) => option.text).join("; "),
    fill_blank: () => right.join(" or "),
    numeric: () => `${right.value}${right.unit ? ` ${right.unit}` : ""}`,
    short_answer: () => `${right.modelAnswer} (key points: ${right.keyPoints.join("; ")})`,
    matching: () => right.map((pair) => `${pair.left} -> ${pair.right}`).join("; "),
    ordering: () => right.join(" -> "),
    balancing: () => question.equation.species.map((item) => `${item.coefficient} ${item.formula}`).join(", ")
  }[question.type]?.() || "";
  const options = question.type === "mcq" || question.type === "multi_select" ? `
Options: ${question.options.map((option, i) => `${String.fromCharCode(65 + i)}. ${option.text}`).join("  ")}` : "";
  const steps = (question.workedSolution || []).length ? `
Worked solution: ${question.workedSolution.join(" | ")}` : "";
  return `REVIEWED QUESTION (the student has already answered it)
Question: ${question.text}${options}
Correct answer: ${answer}${question.explanation ? `
Explanation: ${question.explanation}` : ""}${steps}`;
};

// The text the companion may use for a lesson or a set, as labelled sources. Null when the student may not use it.
const sourcesFor = async (context, userId) => {
  if (context.kind === "general") return { title: "", sources: [] };
  if (context.kind === "question") {
    const question = await answeredQuestion(context.id, userId);
    if (!question) return null;
    return { title: "Quiz question", sources: [{ label: "Reviewed question", text: questionText(question), link: `/tests/${question.test}` }] };
  }
  if (context.kind === "lesson") {
    const lesson = await findVisibleLesson(context.id);
    if (!lesson) return null;
    return { title: lesson.title, sources: [{ label: `Lesson "${lesson.title}"`, text: `${lesson.title}\n\n${lesson.explanation}`, link: `/lessons/${lesson._id}` }] };
  }
  const set = await findOwnSet(context.id, userId);
  if (!set) return null;
  const [note, materials, lessons] = await Promise.all([
    SetNote.findOne({ set: set._id }).lean(),
    SetMaterial.find({ set: set._id, owner: userId }).select("title text").limit(20).lean(),
    lessonTexts(set._id)
  ]);
  const link = `/lab/${set._id}?tab=notes`;
  const sources = [];
  const notesText = notesToText(note?.content);
  if (notesText.trim()) sources.push({ label: `Set "${set.title}" › Notes`, text: notesText, link });
  for (const lesson of lessons) sources.push({ label: `Set "${set.title}" › ${lesson.title}`, text: lesson.text, link });
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
    if (!found) return res.status(404).json({ message: context.kind === "lesson" ? "Lesson not found" : context.kind === "question" ? "Question not found" : "Study set not found" });
    const reviewing = context.kind === "question";

    const asked = cleanHistory(messages);
    const recent = asked.filter((message) => message.role === "user").slice(-2).map((message) => message.content).join(" ");
    // A reviewed question is short and all of it matters, so it goes in whole instead of being cut and ranked.
    const excerpts = reviewing ? found.sources.map((source, i) => ({ n: i + 1, label: source.label, text: source.text, link: source.link })) : pickExcerpts(found.sources, recent);

    const slot = await quota.reserve(req.user.id, "message");
    if (!slot.ok) {
      return res.status(429).json({ message: slot.reason === "resting" ? "AI is resting until tomorrow. Please try again then." : "You have used today's AI messages. They come back tomorrow.", code: slot.reason === "resting" ? "resting" : "daily_limit" });
    }
    reserved = true;

    const me = await User.findById(req.user.id).select("name displayName").lean();
    const names = [me?.name, me?.displayName];
    const base = [{ role: "system", content: systemPrompt(excerpts) }, ...asked];
    // Explaining a reviewed question takes a little more room than a hint.
    let out = await complete({ messages: base, temperature: 0.3, maxTokens: reviewing ? 600 : 350, names });
    let tokens = { inputTokens: out.usage.inputTokens, outputTokens: out.usage.outputTokens };
    // The hint-only retry is for questions still to be answered. A reviewed question may be explained in full.
    if (!reviewing && givesAnswer(out.text)) {
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
    if (context.kind === "general") {
      title = "AI answer in general chat";
      link = "/home";
    } else if (context.kind === "lesson") {
      const lesson = await findVisibleLesson(context.id);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      title = `AI answer about "${lesson.title}"`;
      link = `/lessons/${lesson._id}`;
    } else if (context.kind === "question") {
      const question = await answeredQuestion(context.id, req.user.id);
      if (!question) return res.status(404).json({ message: "Question not found" });
      title = `AI answer about a quiz question: "${question.text.slice(0, 80)}"`;
      link = `/tests/${question.test}`;
    } else {
      const set = await findOwnSet(context.id, req.user.id);
      if (!set) return res.status(404).json({ message: "Study set not found" });
      title = `AI answer in set "${set.title}"`;
      link = `/lab/${set._id}`;
    }
    await Report.create({ user: req.user.id, kind: "ai", target: new mongoose.Types.ObjectId(context.id || req.user.id), category, note: note || "", title: title.slice(0, 200), link, aiQuestion: question, aiAnswer: answer });
    return res.status(201).json({ message: "Thank you. We will check this answer." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStatus, chat, flag, PROBLEMS, LABEL };
