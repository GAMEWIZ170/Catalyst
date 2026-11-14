const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const { summary, practice } = require("../controllers/mistake.controller");

router.use(authenticate);
router.use(requireAccess);

router.get("/", summary);
router.get("/practice", practice);

module.exports = router;
