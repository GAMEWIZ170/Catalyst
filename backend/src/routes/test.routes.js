const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const { validateTestSubmission } = require("../middlewares/validate");
const { getTest, submitTest } = require("../controllers/test.controller");

router.use(authenticate);
router.get("/:id", getTest);
router.post("/:id/submit", validateTestSubmission, submitTest);

module.exports = router;
