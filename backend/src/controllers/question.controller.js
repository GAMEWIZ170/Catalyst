const mongoose = require("mongoose");
const Question = require("../models/question.models");
const Test = require("../models/test.models");
const { findVisibleTest } = require("../utils/visibility");
const { questionForAdmin } = require("../utils/serializers");
const { recordAnswer } = require("./mistake.controller");
const mastery = require("../utils/mastery");
const { grade, correctAnswerOf } = require("../utils/grading");
const { recordStat } = require("../utils/questionStats");

const HAS_OPTIONS = ["mcq", "multi_select"];
const has = (body, key) => Object.prototype.hasOwnProperty.call(body, key);

// Options arrive without ids plus the position(s) of the right one(s). The server makes the ids and stores the right ones.
const setCorrectFromIndexes = (question, prepared) => {
  if (question.type === "mcq") {
    if (!Number.isInteger(prepared.correctIndex) || prepared.correctIndex < 0 ||
      prepared.correctIndex >= question.options.length) return "correctIndex must match one of the options";
    question.correctOption = question.options[prepared.correctIndex]._id;
  } else if (question.type === "multi_select") {
    const indexes = prepared.correctIndexes;
    if (!Array.isArray(indexes) || !indexes.length || !indexes.every((index) => Number.isInteger(index) && index >= 0 && index < question.options.length)) {
      return "correctIndexes must match the options";
    }
    question.correctOptions = [...new Set(indexes)].map((index) => question.options[index]._id);
  }
  return null;
};

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const sendValidationError = (error, res) => res.status(400).json({ message: Object.values(error.errors)[0].message });

const questionData = (body, storedType = body.type) => {
  const data = { ...body, type: storedType };
  const { correctIndex, correctIndexes } = data;
  delete data.correctIndex;
  delete data.correctIndexes;
  delete data.correctOptions;
  if (data.type === "mcq") {
    delete data.correctOption;
  } else {
    data.correctOption = null;
  }
  if (!HAS_OPTIONS.includes(data.type)) data.options = [];
  return { data, correctIndex, correctIndexes };
};

const checkAnswer = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid question ID" });
  try {
    const question = await Question.findOne({ _id: req.params.id, deletedAt: null }).lean();
    const test = question && question.test ? await findVisibleTest(question.test) : null;
    if (!test) return res.status(404).json({ message: "Question not found" });
    const answer = req.body.answer;
    if (typeof answer !== "string") {
      return res.status(400).json({ message: "Please provide an answer" });
    }
    const { isCorrect, unitWrong } = grade(question, answer);
    const correctAnswer = correctAnswerOf(question);
    const wasMistake = await recordAnswer(req.user.id, question._id, isCorrect);
    await recordStat(question, answer, isCorrect);
    // Lesson mastery follows questions from lesson tests. A right answer only counts as review when it was a mistake before.
    if (test.scope === "lesson") {
      if (!isCorrect) await mastery.record(req.user.id, test.lesson._id, { type: "wrong" });
      else if (wasMistake) await mastery.record(req.user.id, test.lesson._id, { type: "review" });
    }
    return res.status(200).json({
      data: { isCorrect, ...(unitWrong ? { unitWrong: true } : {}), correctAnswer, explanation: question.explanation, explanationImage: question.explanationImage, workedSolution: question.workedSolution || [] }
    });
  } catch (error) {
    next(error);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const test = await Test.findOne({ _id: req.body.test, deletedAt: null });
    if (!test) return res.status(404).json({ message: "Test not found" });
    const prepared = questionData(req.body);
    const question = new Question(prepared.data);
    const problem = setCorrectFromIndexes(question, prepared);
    if (problem) return res.status(400).json({ message: problem });
    await question.save();
    return res.status(201).json({ message: "Question created successfully", data: questionForAdmin(question) });
  } catch (error) {
    if (error.name === "ValidationError") return sendValidationError(error, res);
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid question ID" });
  try {
    const question = await Question.findOne({ _id: req.params.id, deletedAt: null });
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (Object.prototype.hasOwnProperty.call(req.body, "type")) {
      return res.status(400).json({ message: "Question type cannot be changed" });
    }
    if (req.body.test && !(await Test.exists({ _id: req.body.test, deletedAt: null }))) {
      return res.status(404).json({ message: "Test not found" });
    }
    const hasOptions = has(req.body, "options");
    const hasCorrectIndex = has(req.body, question.type === "multi_select" ? "correctIndexes" : "correctIndex");
    if (!HAS_OPTIONS.includes(question.type) && (hasOptions || has(req.body, "correctIndex") || has(req.body, "correctIndexes"))) {
      return res.status(400).json({ message: "This question type cannot include options or correctIndex" });
    }
    if (hasOptions !== hasCorrectIndex) return res.status(400).json({ message: "options and correctIndex must be sent together" });
    if (hasOptions) {
      const prepared = questionData(req.body, question.type);
      question.set(prepared.data);
      const problem = setCorrectFromIndexes(question, prepared);
      if (problem) return res.status(400).json({ message: problem });
    } else {
      const data = { ...req.body };
      delete data.correctIndex;
      delete data.correctIndexes;
      data.type = question.type;
      question.set(data);
    }
    await question.save();
    return res.status(200).json({ message: "Question updated successfully", data: questionForAdmin(question) });
  } catch (error) {
    if (error.name === "ValidationError") return sendValidationError(error, res);
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid question ID" });
  try {
    const question = await Question.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { returnDocument: "after" });
    if (!question) return res.status(404).json({ message: "Question not found" });
    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkAnswer, createQuestion, updateQuestion, deleteQuestion, questionData, setCorrectFromIndexes };
