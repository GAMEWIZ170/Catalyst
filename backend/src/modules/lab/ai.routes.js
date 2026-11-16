const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const requireAccess = require("../../middlewares/requireAccess");
const reportLimiter = require("../../middlewares/reportLimiter");
const { validateAiChat, validateAiFlag } = require("../../middlewares/validate");
const { getStatus, chat, flag } = require("./ai.controller");

router.use(authenticate);

router.get("/status", getStatus);
router.post("/chat", requireAccess, validateAiChat, chat);
router.post("/flag", reportLimiter, validateAiFlag, flag);

module.exports = router;
