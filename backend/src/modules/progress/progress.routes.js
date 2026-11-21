const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const { validatePosition, validateStudyTime, validateProgressYear } = require("../../middlewares/validate");
const { getMyProgress, getStreak, getSummary, savePosition, addStudyTime } = require("./progress.controller");

router.use(authenticate);

router.get("/", getMyProgress);
router.get("/streak", getStreak);
router.get("/summary", validateProgressYear, getSummary);
router.put("/position", validatePosition, savePosition);
router.post("/study-time", validateStudyTime, addStudyTime);

module.exports = router;