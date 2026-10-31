// src/routes/lesson.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { getLessonByID } = require("../controllers/lesson.controller");
const { markLessonDone } = require("../controllers/progress.controller");
const markDoneLimiter = require("../middlewares/markDoneLimiter");

router.use(authenticate);

router.get("/:id", getLessonByID);
router.post("/:id/mark-done", markDoneLimiter, markLessonDone);

module.exports = router;