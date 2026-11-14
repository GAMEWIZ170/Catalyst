const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { validateHallGoal } = require("../middlewares/validate");
const { status, heartbeat, leave } = require("../controllers/hall.controller");

router.use(authenticate);

router.get("/", status);
router.post("/heartbeat", validateHallGoal, heartbeat);
router.delete("/", leave);

module.exports = router;
