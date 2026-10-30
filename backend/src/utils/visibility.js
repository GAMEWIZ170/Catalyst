// src/utils/visibility.js
const Lesson = require("../models/lesson.models");

const lessonIsVisible = (lesson) => {
  const unit = lesson && lesson.unit;
  const course = unit && unit.course;
  return Boolean(
    lesson && lesson.isPublished && !lesson.deletedAt &&
    unit && !unit.deletedAt &&
    course && course.isPublished && !course.deletedAt
  );
};

// Finds a lesson only if the student is allowed to see it
const findVisibleLesson = async (id) => {
  const lesson = await Lesson.findOne({ _id: id, isPublished: true, deletedAt: null })
    .populate({
      path: "unit",
      select: "deletedAt course",
      populate: { path: "course", select: "isPublished deletedAt" }
    })
    .lean();

  return lessonIsVisible(lesson) ? lesson : null;
};

module.exports = { lessonIsVisible, findVisibleLesson };