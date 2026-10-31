const express = require("express");
const authenticate = require("../middlewares/authenticate");
const { getLessonMaterials } = require("../controllers/material.controller");
const router = express.Router();
router.get("/lessons/:id/materials", authenticate, getLessonMaterials);
module.exports = router;
