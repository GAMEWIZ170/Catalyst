const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const examLimiter = require("../middlewares/examLimiter");
const { validateExamSave } = require("../middlewares/validate");
const { start, save, submit } = require("../controllers/exam.controller");

// Mounted at /api/v1 next to other routers, so the guards are added per route instead of with router.use.
const guard = [authenticate, requireAccess, examLimiter];

router.post("/tests/:id/exam/start", ...guard, start);
router.put("/exam-attempts/:attemptId", ...guard, validateExamSave, save);
router.post("/exam-attempts/:attemptId/submit", ...guard, validateExamSave, submit);

module.exports = router;
