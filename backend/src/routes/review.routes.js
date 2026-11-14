const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const { due, session } = require("../controllers/review.controller");

router.use(authenticate);
router.use(requireAccess);

router.get("/due", due);
router.get("/session", session);

module.exports = router;
