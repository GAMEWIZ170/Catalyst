const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const { validateTestSubmission } = require("../middlewares/validate");
const submitLimiter = require("../middlewares/submitLimiter");
const { getTest, submitTest } = require("../controllers/test.controller");
const mongoose = require("mongoose");

const validateTestId = (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid test ID" });
  }
  next();
};

router.use(authenticate);
router.get("/:id", getTest);
router.post("/:id/submit", validateTestId, submitLimiter, validateTestSubmission, submitTest);

module.exports = router;
