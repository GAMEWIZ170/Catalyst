// src/routes/question.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { validateAnswer } = require("../middleware/validate");
const { checkAnswer } = require("../controllers/question.controller");

router.use(authenticate);

router.post("/:id/answer", validateAnswer, checkAnswer);

module.exports = router;