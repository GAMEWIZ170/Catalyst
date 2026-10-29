// src/routes/question.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { validateAnswer } = require("../middlewares/validate");
const { checkAnswer } = require("../controllers/question.controller");

router.use(authenticate);

router.post("/:id/answer", validateAnswer, checkAnswer);

module.exports = router;