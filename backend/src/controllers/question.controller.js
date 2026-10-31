const mongoose = require("mongoose");
const Question = require("../models/question.models");
const Test = require("../models/test.models");
const { findVisibleTest } = require("../utils/visibility");
const { questionForAdmin } = require("./test.controller");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const sendValidationError = (error, res) => res.status(400).json({ message: Object.values(error.errors)[0].message });

const questionData = (body) => {
  const data = { ...body };
  const correctIndex = data.correctIndex;
  delete data.correctIndex;
  if (data.type === "mcq") {
    delete data.correctOption;
  } else {
    data.options = [];
    data.correctOption = null;
  }
  return { data, correctIndex };
};

const checkAnswer = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid question ID" });
  try {
    const question = await Question.findOne({ _id: req.params.id, deletedAt: null })
      .populate({
        path: "test",
        populate: [
          { path: "lesson", select: "isPublished deletedAt unit", populate: { path: "unit", select: "deletedAt course", populate: { path: "course", select: "isPublished deletedAt" } } },
          { path: "unit", select: "deletedAt course", populate: { path: "course", select: "isPublished deletedAt" } },
          { path: "course", select: "isPublished deletedAt" }
        ]
      }).lean();
    if (!question || !question.test || !(await findVisibleTest(question.test._id))) {
      return res.status(404).json({ message: "Question not found" });
    }
    const answer = req.body.answer;
    let isCorrect = false;
    let correctAnswer;
    if (question.type === "mcq") {
      isCorrect = answer === question.correctOption.toString();
      correctAnswer = question.options.find((option) => option._id.toString() === question.correctOption.toString());
    } else {
      isCorrect = answer.toLowerCase() === question.correctAnswer;
      correctAnswer = question.correctAnswer;
    }
    return res.status(200).json({
      data: { isCorrect, correctAnswer, explanation: question.explanation, explanationImage: question.explanationImage }
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
    if (question.type === "mcq") question.correctOption = question.options[prepared.correctIndex]._id;
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
    const hasOptions = Object.prototype.hasOwnProperty.call(req.body, "options");
    const hasCorrectIndex = Object.prototype.hasOwnProperty.call(req.body, "correctIndex");
    if (hasOptions !== hasCorrectIndex) return res.status(400).json({ message: "options and correctIndex must be sent together" });
    if (hasOptions) {
      const prepared = questionData(req.body);
      question.set(prepared.data);
      if (question.type === "mcq") question.correctOption = question.options[prepared.correctIndex]._id;
    } else {
      const data = { ...req.body };
      delete data.correctIndex;
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
    const question = await Question.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { new: true });
    if (!question) return res.status(404).json({ message: "Question not found" });
    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkAnswer, createQuestion, updateQuestion, deleteQuestion };
