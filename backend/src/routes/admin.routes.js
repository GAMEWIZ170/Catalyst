const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const authorizeRole = require("../middlewares/authorizeRole");
const {
  validateCourse, validateCourseUpdate, validateCategory, validateCategoryUpdate, validateAuthor, validateAuthorUpdate,
  validateUnit, validateUnitUpdate,
  validateLesson, validateLessonUpdate,
  validateQuestion, validateQuestionUpdate,
  validateTest, validateTestUpdate,
  validateFlashcard, validateFlashcardUpdate
  , validateMaterial, validateMaterialUpdate,
  validateReorderUnits, validateReorderLessons, validateReorderTests,
  validateReorderQuestions, validateReorderFlashcards, validateReorderMaterials,
  validateUserUpdate, validateAnswer, validateResolveReport, validateUnitSummary
} = require("../middlewares/validate");

const course = require("../controllers/course.controller");
const catalog = require("../controllers/catalog.controller");
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
const preview = require("../controllers/preview.controller");
const analytics = require("../controllers/analytics.controller");
const dashboard = require("../controllers/dashboard.controller");
const reports = require("../controllers/report.controller");
const importer = require("../controllers/import.controller");
const summary = require("../controllers/summary.controller");
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

// Categories and authors for courses
router.get("/categories", catalog.listCategories);
router.post("/categories", validateCategory, catalog.createCategory);
router.put("/categories/:id", validateCategoryUpdate, catalog.updateCategory);
router.delete("/categories/:id", catalog.deleteCategory);
router.get("/authors", catalog.listAuthors);
router.post("/authors", validateAuthor, catalog.createAuthor);
router.put("/authors/:id", validateAuthorUpdate, catalog.updateAuthor);
router.delete("/authors/:id", catalog.deleteAuthor);

// Units
router.put("/units/reorder", validateReorderUnits, reorder({
  model: Unit,
  parentModel: Course,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.course, deletedAt: null }, childFilter: { course: req.body.course } }),
  parentError: "Course not found"
}));
router.post("/units", validateUnit, unit.createUnit);
// Makes a PDF summary of the unit and saves it as an (unpublished) PDF material on one of its lessons.
router.post("/units/:id/summary-pdf", uploadLimiter, validateUnitSummary, summary.createUnitSummary);
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
router.get("/lessons/:id/versions", lesson.listLessonVersions);
router.post("/lessons/:id/versions/:versionId/restore", lesson.restoreLessonVersion);
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
// CSV import: the file arrives as text/csv, up to 1 MB. Dry run by default; ?dryRun=0 saves.
router.post("/tests/:id/import", express.text({ type: "text/csv", limit: "1mb" }), importer.importQuestions);
router.put("/tests/:id", validateTestUpdate, test.updateTest);
router.delete("/tests/:id", test.deleteTest);

// Questions
router.put("/questions/reorder", validateReorderQuestions, reorder({
  model: Question,
  parentModel: Test,
  getParentFilter: (req) => ({ parentFilter: { _id: req.body.test, deletedAt: null }, childFilter: { test: req.body.test } }),
  parentError: "Test not found"
}));
router.get("/questions/import-template", importer.downloadTemplate);
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

// Preview as student (read-only, nothing is recorded)
router.get("/preview/lessons/:id", preview.previewLesson);
router.get("/preview/tests/:id", preview.previewTest);
router.post("/preview/questions/:id/answer", validateAnswer, preview.previewAnswer);

// Dashboard numbers (worked out nightly by scripts/compute-stats.js)
router.get("/dashboard", dashboard.getDashboard);

// Question analytics and the report inbox
router.get("/analytics/questions", analytics.questionAnalytics);
router.get("/reports", reports.listReports);
router.put("/reports/:id/resolve", validateResolveReport, reports.resolveReport);

// Users
router.get("/users", admin.getAllUsers);
router.put("/users/:id", validateUserUpdate, admin.updateUser);
router.get("/stats", admin.getStats);
router.get("/trash", trash.listTrash);
router.post("/trash/:type/:id/restore", trash.restore);

module.exports = router;