const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { listMine, markSeen } = require("../controllers/achievement.controller");

router.use(authenticate);

router.get("/", listMine);
router.post("/seen", markSeen);

module.exports = router;
