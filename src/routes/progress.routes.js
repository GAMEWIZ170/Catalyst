// src/routes/progress.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { getMyProgress, getStreak } = require("../controllers/progress.controller");

router.use(authenticate);

router.get("/", getMyProgress);
router.get("/streak", getStreak);

module.exports = router;