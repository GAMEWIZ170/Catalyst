const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { getMyProgress, getStreak, getOverview } = require("../controllers/progress.controller");

router.use(authenticate);

router.get("/", getMyProgress);
router.get("/streak", getStreak);
router.get("/overview", getOverview);

module.exports = router;