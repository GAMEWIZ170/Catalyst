const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const { getMyXp, markLevelSeen } = require("./xp.controller");

router.use(authenticate);

router.get("/me", getMyXp);
router.post("/seen", markLevelSeen);

module.exports = router;
