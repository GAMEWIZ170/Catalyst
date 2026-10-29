const Course = require("../models/course.models");
const mongoose = require("mongoose");

const createCourse = async (req, res, next) => {
  try {
    const course = new Course(req.body);
    await course.save();

    // CHANGED: 201, because a new record was created
    return res.status(201).json({
      message: "Course created successfully",
      data: course
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this code already exists"
      });
    }
    next(error);
  }
};

const getCourseByID = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      isPublished: true,
      deletedAt: null // CHANGED: deleted courses are hidden
    });

    if (!course) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }

    // CHANGED: removed the "created" message; a read just returns the data
    return res.status(200).json({ data: course });
  } catch (error) {
    next(error);
  }
};

const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      isPublished: true,
      deletedAt: null // CHANGED: deleted courses are hidden
    })
      .select("code title description")
      .sort({ code: 1 })
      .lean();

    // CHANGED: removed the "created" message
    return res.status(200).json({ count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  // CHANGED: check the ID first, so a bad ID gives a 400 instead of a 500
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    // CHANGED: findOneAndUpdate so we can also require deletedAt: null,
    // which stops a deleted course from being edited
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({
      message: "Course updated successfully",
      data: updatedCourse
    });
  } catch (error) {
    // CHANGED: a new code that clashes with another course
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this code already exists"
      });
    }
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  // CHANGED: ID check added
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    // CHANGED: soft delete. Nothing is removed; we stamp the date, and the
    // read functions above skip any course that has a deletedAt value.
    const deletedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedCourse) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    next(error);
  }
};


// ADMIN: every course that isn't deleted, drafts included
const getAllCoursesForAdmin = async (req, res, next) => {
  try {
    const courses = await Course.find({ deletedAt: null })
      .select("code title description isPublished")
      .sort({ code: 1 })
      .lean();

    return res.status(200).json({ count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createCourse,
  getCourseByID,
  getAllCourses,
  updateCourse,
  deleteCourse,
  getAllCoursesForAdmin
};