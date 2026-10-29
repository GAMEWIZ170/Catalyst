// src/routes/course.route.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { getAllCourses, getCourseByID } = require("../controllers/course.controller");

router.use(authenticate);

router.get("/", getAllCourses);
router.get("/:id", getCourseByID);

module.exports = router;