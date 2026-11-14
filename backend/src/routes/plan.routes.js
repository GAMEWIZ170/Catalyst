const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const { getPlan } = require("../controllers/plan.controller");

router.use(authenticate);
router.use(requireAccess);

router.get("/", getPlan);

module.exports = router;
