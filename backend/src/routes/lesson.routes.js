const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const { getLessonByID } = require("../controllers/lesson.controller");
const { markLessonDone } = require("../controllers/progress.controller");
const markDoneLimiter = require("../middlewares/markDoneLimiter");

router.use(authenticate);
router.use(requireAccess);

router.get("/:id", getLessonByID);
router.post("/:id/mark-done", markDoneLimiter, markLessonDone);

module.exports = router;