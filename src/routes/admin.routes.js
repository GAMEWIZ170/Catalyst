// src/routes/admin.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const authorizeRole = require("../middleware/authorizeRole");
const {
  validateCourse, validateCourseUpdate,
  validateUnit, validateUnitUpdate,
  validateLesson, validateLessonUpdate,
  validateQuestion, validateQuestionUpdate
} = require("../middleware/validate");

const course = require("../controllers/course.controller");
const unit = require("../controllers/unit.controller");
const lesson = require("../controllers/lesson.controller");
const question = require("../controllers/question.controller");
const admin = require("../controllers/admin.controller");

// Everything below this line requires a login AND the admin role
router.use(authenticate, authorizeRole("admin"));

// Courses
router.get("/courses", course.getAllCoursesForAdmin);
router.post("/courses", validateCourse, course.createCourse);
router.put("/courses/:id", validateCourseUpdate, course.updateCourse);
router.delete("/courses/:id", course.deleteCourse);

// Units
router.post("/units", validateUnit, unit.createUnit);
router.put("/units/:id", validateUnitUpdate, unit.updateUnit);
router.delete("/units/:id", unit.deleteUnit);

// Lessons
router.post("/lessons", validateLesson, lesson.createLesson);
router.get("/lessons/:id", lesson.getLessonForAdmin);
router.put("/lessons/:id", validateLessonUpdate, lesson.updateLesson);
router.delete("/lessons/:id", lesson.deleteLesson);

// Questions
router.post("/questions", validateQuestion, question.createQuestion);
router.put("/questions/:id", validateQuestionUpdate, question.updateQuestion);
router.delete("/questions/:id", question.deleteQuestion);

// Users
router.get("/users", admin.getAllUsers);

module.exports = router;