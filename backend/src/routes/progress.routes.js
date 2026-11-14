const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { validatePosition, validateStudyTime } = require("../middlewares/validate");
const { getMyProgress, getStreak, getOverview, savePosition, addStudyTime } = require("../controllers/progress.controller");

router.use(authenticate);

router.get("/", getMyProgress);
router.get("/streak", getStreak);
router.get("/overview", getOverview);
router.put("/position", validatePosition, savePosition);
router.post("/study-time", validateStudyTime, addStudyTime);

module.exports = router;