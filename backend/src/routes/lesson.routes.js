// src/routes/lesson.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { validateCompletion } = require("../middlewares/validate");
const { getLessonByID } = require("../controllers/lesson.controller");
const { completeLesson } = require("../controllers/progress.controller");

router.use(authenticate);

router.get("/:id", getLessonByID);
router.post("/:id/complete", validateCompletion, completeLesson);

module.exports = router;