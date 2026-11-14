const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const reportLimiter = require("../middlewares/reportLimiter");
const { validateReport } = require("../middlewares/validate");
const { createReport } = require("../controllers/report.controller");

router.use(authenticate);
router.use(requireAccess);

router.post("/", reportLimiter, validateReport, createReport);

module.exports = router;
