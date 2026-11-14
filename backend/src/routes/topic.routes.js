const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const { list, practice } = require("../controllers/topic.controller");

router.use(authenticate);
router.use(requireAccess);

router.get("/", list);
router.get("/practice", practice);

module.exports = router;
