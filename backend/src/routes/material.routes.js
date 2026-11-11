const express = require("express");
const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const { getLessonMaterials } = require("../controllers/material.controller");
const router = express.Router();
router.get("/lessons/:id/materials", authenticate, requireAccess, getLessonMaterials);
module.exports = router;
