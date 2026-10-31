const express = require("express");
const mongoose = require("mongoose");
const authenticate = require("../middlewares/authenticate");
const validators = require("../middlewares/validate");
const { getLessonFlashcards, rateFlashcard } = require("../controllers/flashcard.controller");
const flashcardRateLimiter = require("../middlewares/flashcardRateLimiter");

const router = express.Router();
const validateFlashcardId = (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid flashcard ID" });
  next();
};

router.get("/lessons/:id/flashcards", authenticate, getLessonFlashcards);
router.post("/flashcards/:id/rate", authenticate, validateFlashcardId, flashcardRateLimiter, validators.validateRating, rateFlashcard);

module.exports = router;
