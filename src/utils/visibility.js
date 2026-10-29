// utils/visibility.js
const lessonIsVisible = (lesson) => {
  const unit = lesson && lesson.unit;
  const course = unit && unit.course;
  return Boolean(
    lesson && lesson.isPublished && !lesson.deletedAt &&
    unit && !unit.deletedAt &&
    course && course.isPublished && !course.deletedAt
  );
};

module.exports = { lessonIsVisible };