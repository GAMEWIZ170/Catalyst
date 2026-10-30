// src/routes/question.routes.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { validateAnswer } = require("../middlewares/validate");
const { checkAnswer } = require("../controllers/question.controller");
const answerLimiter = require("../middlewares/answerLimiter");

router.use(authenticate);

router.post("/:id/answer", answerLimiter, validateAnswer, checkAnswer);

module.exports = router;