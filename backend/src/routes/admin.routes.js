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
  , validateMaterial, validateMaterialUpdate
} = require("../middlewares/validate");

const course = require("../controllers/course.controller");
const unit = require("../controllers/unit.controller");
const lesson = require("../controllers/lesson.controller");
const question = require("../controllers/question.controller");
const admin = require("../controllers/admin.controller");
const test = require("../controllers/test.controller");
const upload = require("../controllers/upload.controller");
const { uploadImage } = require("../middlewares/upload");
const uploadLimiter = require("../middlewares/uploadLimiter");
const flashcard = require("../controllers/flashcard.controller");
const material = require("../controllers/material.controller");
const { uploadMaterial } = require("../middlewares/materialUpload");

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

// Tests
router.post("/tests", validateTest, test.createTest);
router.get("/tests/:id", test.getTestForAdmin);
router.put("/tests/:id", validateTestUpdate, test.updateTest);
router.delete("/tests/:id", test.deleteTest);

// Questions
router.post("/questions", validateQuestion, question.createQuestion);
router.put("/questions/:id", validateQuestionUpdate, question.updateQuestion);
router.delete("/questions/:id", question.deleteQuestion);

router.post("/flashcards", validateFlashcard, flashcard.createFlashcard);
router.put("/flashcards/:id", validateFlashcardUpdate, flashcard.updateFlashcard);
router.delete("/flashcards/:id", flashcard.deleteFlashcard);
router.post("/uploads/material", uploadLimiter, uploadMaterial, material.uploadMaterialFile);
router.post("/materials", validateMaterial, material.createMaterial);
router.put("/materials/:id", validateMaterialUpdate, material.updateMaterial);
router.delete("/materials/:id", material.deleteMaterial);

// Uploads
router.post("/uploads", uploadLimiter, uploadImage, upload.uploadImage);

// Users
router.get("/users", admin.getAllUsers);

module.exports = router;