// src/controllers/progressController.js
const mongoose = require("mongoose");
const Progress = require("../models/progress.models");
const Question = require("../models/question.models");
const { findVisibleLesson } = require("../utils/visibility");
const normalize = require("../utils/normalize");
const calculateStreak = require("../utils/streak");

const todayKey = () => new Date().toISOString().slice(0, 10);

// STUDENT: submit all the answers for a lesson; the SERVER grades them
const completeLesson = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid lesson ID" });
  }
  try {
    const lesson = await findVisibleLesson(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Only multiple choice and true/false can be graded; flashcards are skipped
    const questions = await Question.find({
      lesson: lesson._id,
      deletedAt: null,
      type: { $in: ["mcq", "true_false"] }
    })
      .select("correctAnswer")
      .lean();

    // Turn the submitted list into a lookup: questionId -> answer
    const given = new Map(req.body.answers.map((a) => [a.questionId, a.answer]));

    let correct = 0;
    for (const question of questions) {
      const answer = given.get(question._id.toString());
      // A question the student skipped counts as wrong
      if (answer !== undefined && normalize(answer) === normalize(question.correctAnswer)) {
        correct++;
      }
    }

    const total = questions.length;
    const score = total === 0 ? 100 : Math.round((correct / total) * 100);

    // One atomic update: create the record if it's missing, otherwise update it
    const progress = await Progress.findOneAndUpdate(
      { user: req.user.id, lesson: lesson._id },
      {
        $max: { score },                         // keep the best score
        $set: { completed: true },
        $setOnInsert: { completedAt: new Date() }, // only the first time
        $addToSet: { completedDays: todayKey() }   // add today if not already there
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Lesson completed",
      data: { score, correct, total, bestScore: progress.score }
    });
  } catch (error) {
    next(error);
  }
};

// STUDENT: all of this student's progress
const getMyProgress = async (req, res, next) => {
  try {
    const progress = await Progress.find({ user: req.user.id })
      .select("lesson completed score completedAt -_id")
      .lean();

    return res.status(200).json({ count: progress.length, data: progress });
  } catch (error) {
    next(error);
  }
};

// STUDENT: current daily streak
const getStreak = async (req, res, next) => {
  try {
    const records = await Progress.find({ user: req.user.id })
      .select("completedDays")
      .lean();

    const days = records.flatMap((record) => record.completedDays);

    return res.status(200).json({
      data: {
        streak: calculateStreak(days),
        completedToday: days.includes(todayKey())
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { completeLesson, getMyProgress, getStreak };