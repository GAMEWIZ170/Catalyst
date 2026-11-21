const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const requireAccess = require("../../middlewares/requireAccess");
const examLimiter = require("../../middlewares/examLimiter");
const { validateExamSave, validateExamSelfMark } = require("../../middlewares/validate");
const { start, save, submit, selfMark } = require("./exam.controller");

// Mounted at /api/v1 next to other routers, so the guards are added per route instead of with router.use.
const guard = [authenticate, requireAccess, examLimiter];

router.post("/tests/:id/exam/start", ...guard, start);
router.put("/exam-attempts/:attemptId", ...guard, validateExamSave, save);
router.post("/exam-attempts/:attemptId/submit", ...guard, validateExamSave, submit);
router.post("/exam-attempts/:attemptId/self-mark", ...guard, validateExamSelfMark, selfMark);

module.exports = router;
