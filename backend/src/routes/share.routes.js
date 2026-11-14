const express = require("express");
const router = express.Router();

const { challengeLink, inviteLink, lessonLink, setLink } = require("../controllers/share.controller");

// Public on purpose: a chat app fetches these without signing in. See share.controller.js for what they may show.
router.get("/c/:id", challengeLink);
router.get("/i/:id", inviteLink);
router.get("/l/:id", lessonLink);
router.get("/s/:id", setLink);

module.exports = router;
