const express = require("express");

const router = express.Router();

const { getAllCourses, getCourseByID } = require("../controllers/course.controller");

router.get('/', getAllCourses);

router.get('/:courseId', getCourseByID);


module.exports = router;



