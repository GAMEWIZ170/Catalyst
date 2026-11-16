const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const { getAllCourses, getCourseByID, listCategories } = require("./course.controller");

router.use(authenticate);

router.get("/categories", listCategories);
router.get("/", getAllCourses);
router.get("/:id", getCourseByID);

module.exports = router;