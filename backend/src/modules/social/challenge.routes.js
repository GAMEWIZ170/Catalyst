const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const submitLimiter = require("../../middlewares/submitLimiter");
const { validateChallenge, validateTestSubmission } = require("../../middlewares/validate");
const { createChallenge, listMine, getChallenge, submitChallenge } = require("./challenge.controller");

router.use(authenticate);

router.get("/", listMine);
router.post("/", validateChallenge, createChallenge);
router.get("/:id", getChallenge);
router.post("/:id/submit", submitLimiter, validateTestSubmission, submitChallenge);

module.exports = router;
