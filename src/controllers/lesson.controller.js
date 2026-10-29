const mongoose = require("mongoose");
const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Question = require("../models/question.models");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);

// STUDENT: one lesson, with its questions but WITHOUT the answers
const getLessonByID = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lesson ID" });
  }
  try {
    // populate() replaces the unit's ID with the unit itself, and the
    // nested populate does the same for the unit's course. That lets us
    // check the whole chain: lesson -> unit -> course.
    const lesson = await Lesson.findOne({
      _id: req.params.id,
      isPublished: true,
      deletedAt: null
    })
      .populate({
        path: "unit",
        select: "deletedAt course",
        populate: { path: "course", select: "isPublished deletedAt" }
      })
      .lean();

    const unit = lesson && lesson.unit;
    const course = unit && unit.course;

    // A lesson is only visible if its unit and course are visible too
    if (!lesson || !unit || unit.deletedAt || !course || !course.isPublished || course.deletedAt) {
      return res.status(404).json({
        message: `Lesson with ID ${req.params.id} not found`
      });
    }

    // select() lists the fields we WANT; correctAnswer and explanation are
    // left out on purpose, so they can't be read from the page's code
    const questions = await Question.find({ lesson: lesson._id, deletedAt: null })
      .select("type text options order")
      .sort({ order: 1 })
      .lean();

    return res.status(200).json({
      data: {
        _id: lesson._id,
        unit: unit._id,
        title: lesson.title,
        order: lesson.order,
        explanation: lesson.explanation,
        videoHost: lesson.videoHost,
        videoId: lesson.videoId,
        questions
      }
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: one lesson in full, answers included, drafts included
const getLessonForAdmin = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lesson ID" });
  }
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, deletedAt: null }).lean();

    if (!lesson) {
      return res.status(404).json({
        message: `Lesson with ID ${req.params.id} not found`
      });
    }

    const questions = await Question.find({ lesson: lesson._id, deletedAt: null })
      .sort({ order: 1 })
      .lean();

    return res.status(200).json({ data: { ...lesson, questions } });
  } catch (error) {
    next(error);
  }
};

const createLesson = async (req, res, next) => {
  try {
    // The Joi validator only checks that req.body.unit LOOKS like an ID.
    // Here we check that the unit really exists.
    const unitExists = await Unit.exists({ _id: req.body.unit, deletedAt: null });
    if (!unitExists) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const lesson = await Lesson.create(req.body);

    return res.status(201).json({
      message: "Lesson created successfully",
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

const updateLesson = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lesson ID" });
  }
  try {
    // If the update moves the lesson to another unit, that unit must exist
    if (req.body.unit) {
      const unitExists = await Unit.exists({ _id: req.body.unit, deletedAt: null });
      if (!unitExists) {
        return res.status(404).json({ message: "Unit not found" });
      }
    }

    const lesson = await Lesson.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );

    if (!lesson) {
      return res.status(404).json({
        message: `Lesson with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({
      message: "Lesson updated successfully",
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

const deleteLesson = async (req, res, next) => {
  if (badId(req.params.id)) {
    return res.status(400).json({ message: "Invalid lesson ID" });
  }
  try {
    // Soft delete, the same rule as for courses
    const lesson = await Lesson.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!lesson) {
      return res.status(404).json({
        message: `Lesson with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLessonByID,
  getLessonForAdmin,
  createLesson,
  updateLesson,
  deleteLesson
};