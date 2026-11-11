const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const authorizeRole = require("../middlewares/authorizeRole");
const {
  validateCourse, validateCourseUpdate,
  validateUnit, validateUnitUpdate,
  validateLesson, validateLessonUpdate,
  validateQuestion, validateQuestionUpdate,
  validateTest, validateTestUpdate,
  validateFlashcard, validateFlashcardUpdate
  , validateMaterial, validateMaterialUpdate,
  validateReorderUnits, validateReorderLessons, validateReorderTests,
  validateReorderQuestions, validateReorderFlashcards, validateReorderMaterials,
  validateUserUpdate
} = require("../middlewares/validate");

const course = require("../controllers/course.controller");
const unit = require("../controllers/unit.controller");
const lesson = require("../controllers/lesson.controller");
const question = require("../controllers/question.controller");
const admin = require("../controllers/admin.controller");
const trash = require("../controllers/trash.controller");
const test = require("../controllers/test.controller");
const upload = require("../controllers/upload.controller");
const { uploadImage } = require("../middlewares/upload");
const uploadLimiter = require("../middlewares/uploadLimiter");
const flashcard = require("../controllers/flashcard.controller");
const material = require("../controllers/material.controller");
const { uploadMaterial } = require("../middlewares/materialUpload");
const reorder = require("../controllers/reorder.controller");
const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");

// Everything below this line requires a login AND the admin role
router.use(authenticate, authorizeRole("admin"));

// Courses
router.get("/courses", course.getAllCoursesForAdmin);
router.get("/courses/:id", course.getCourseForAdmin);
router.post("/courses", validateCourse, course.createCourse);
router.put("/courses/:id", validateCourseUpdate, course.updateCourse);
router.delete("/courses/:id", course.deleteCourse);

// Units
router.put("/units/reorder", validateReorderUnits, reorder({
  model: Unit,
  parentModel: Course,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.course, deletedAt: null }, childFilter: { course: req.body.course } }),
  parentError: "Course not found"
}));
router.post("/units", validateUnit, unit.createUnit);
router.put("/units/:id", validateUnitUpdate, unit.updateUnit);
router.delete("/units/:id", unit.deleteUnit);

// Lessons
router.put("/lessons/reorder", validateReorderLessons, reorder({
  model: Lesson,
  parentModel: Unit,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.unit, deletedAt: null }, childFilter: { unit: req.body.unit } }),
  parentError: "Unit not found"
}));
router.post("/lessons", validateLesson, lesson.createLesson);
router.get("/lessons/:id", lesson.getLessonForAdmin);
router.put("/lessons/:id", validateLessonUpdate, lesson.updateLesson);
router.delete("/lessons/:id", lesson.deleteLesson);

// Tests
router.put("/tests/reorder", validateReorderTests, reorder({
  model: Test,
  parentModel: Course,
  getParentFilter: (req) => {
    const parentModel = req.body.scope === "course" ? Course : req.body.scope === "unit" ? Unit : Lesson;
    return {
      parentModel,
      parentFilter: { _id: req.body.parent, deletedAt: null },
      childFilter: { scope: req.body.scope, [req.body.scope]: req.body.parent }
    };
  },
  parentError: "Test parent not found"
}));
router.post("/tests", validateTest, test.createTest);
router.get("/tests/:id", test.getTestForAdmin);
router.put("/tests/:id", validateTestUpdate, test.updateTest);
router.delete("/tests/:id", test.deleteTest);

// Questions
router.put("/questions/reorder", validateReorderQuestions, reorder({
  model: Question,
  parentModel: Test,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.test, deletedAt: null }, childFilter: { test: req.body.test } }),
  parentError: "Test not found"
}));
router.post("/questions", validateQuestion, question.createQuestion);
router.put("/questions/:id", validateQuestionUpdate, question.updateQuestion);
router.delete("/questions/:id", question.deleteQuestion);

router.put("/flashcards/reorder", validateReorderFlashcards, reorder({
  model: Flashcard,
  parentModel: Lesson,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.lesson, deletedAt: null }, childFilter: { lesson: req.body.lesson } }),
  parentError: "Lesson not found"
}));
router.post("/flashcards", validateFlashcard, flashcard.createFlashcard);
router.put("/flashcards/:id", validateFlashcardUpdate, flashcard.updateFlashcard);
router.delete("/flashcards/:id", flashcard.deleteFlashcard);
router.put("/materials/reorder", validateReorderMaterials, reorder({
  model: Material,
  parentModel: Lesson,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.lesson, deletedAt: null }, childFilter: { lesson: req.body.lesson } }),
  parentError: "Lesson not found"
}));
router.post("/uploads/material", uploadLimiter, uploadMaterial, material.uploadMaterialFile);
router.post("/materials", validateMaterial, material.createMaterial);
router.put("/materials/:id", validateMaterialUpdate, material.updateMaterial);
router.delete("/materials/:id", material.deleteMaterial);

// Uploads
router.post("/uploads", uploadLimiter, uploadImage, upload.uploadImage);

// Users
router.get("/users", admin.getAllUsers);
router.put("/users/:id", validateUserUpdate, admin.updateUser);
router.get("/stats", admin.getStats);
router.get("/trash", trash.listTrash);
router.post("/trash/:type/:id/restore", trash.restore);

module.exports = router;