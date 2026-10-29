const mongoose = require("mongoose");
const Question = require("../models/question.models");
const Lesson = require("../models/lesson.models");
const { lessonIsVisible } = require("../utils/visibility");
const normalize = require("../utils/normalize");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);

// Turns a Mongoose ValidationError into a clean 400 with the first message
const sendValidationError = (error, res) =>
  res.status(400).json({ message: Object.values(error.errors)[0].message });


// STUDENT: check an answer and reveal the correct one with its explanation
const checkAnswer = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid question ID" });
  }
  try {
    const question = await Question.findOne({ _id: req.params.id, deletedAt: null })
      .populate({
        path: "lesson",
        select: "isPublished deletedAt unit",
        populate: {
          path: "unit",
          select: "deletedAt course",
          populate: { path: "course", select: "isPublished deletedAt" }
        }
      })
      .lean();

    if (!question || !lessonIsVisible(question.lesson)) {
      return res.status(404).json({ message: "Question not found" });
    }

    // A flashcard is "flipped", not answered, so there is nothing to grade
    if (question.type === "flashcard") {
      return res.status(200).json({
        data: {
          isCorrect: null,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation
        }
      });
    }

    const { answer } = req.body;
    if (!answer) {
      return res.status(400).json({ message: "Please provide an answer" });
    }

    const isCorrect = normalize(answer) === normalize(question.correctAnswer);

    return res.status(200).json({
      data: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      }
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN
const createQuestion = async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.body.lesson, deletedAt: null })
      .populate({
        path: "unit",
        select: "deletedAt course",
        populate: { path: "course", select: "deletedAt" }
      });
    const unit = lesson && lesson.unit;
    const course = unit && unit.course;
    if (!lesson || !unit || unit.deletedAt || !course || course.deletedAt) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const question = await Question.create(req.body);

    return res.status(201).json({
      message: "Question created successfully",
      data: question
    });
  } catch (error) {
    if (error.name === "ValidationError") return sendValidationError(error, res);
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid question ID" });
  }
  try {
    if (req.body.lesson) {
      const lesson = await Lesson.findOne({ _id: req.body.lesson, deletedAt: null })
        .populate({
          path: "unit",
          select: "deletedAt course",
          populate: { path: "course", select: "deletedAt" }
        });
      const unit = lesson && lesson.unit;
      const course = unit && unit.course;
      if (!lesson || !unit || unit.deletedAt || !course || course.deletedAt) {
        return res.status(404).json({ message: "Lesson not found" });
      }
    }

    const question = await Question.findOne({ _id: req.params.id, deletedAt: null });
    if (!question) {
      return res.status(404).json({
        message: `Question with ID ${req.params.id} not found`
      });
    }

    // set() applies the changes, and save() then runs ALL the rules,
    // including the pre("validate") hook, on the finished question
    question.set(req.body);
    await question.save();

    return res.status(200).json({
      message: "Question updated successfully",
      data: question
    });
  } catch (error) {
    if (error.name === "ValidationError") return sendValidationError(error, res);
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid question ID" });
  }
  try {
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({
        message: `Question with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkAnswer, createQuestion, updateQuestion, deleteQuestion };