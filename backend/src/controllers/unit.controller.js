const mongoose = require("mongoose");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");

const createUnit = async (req, res, next) => {
  try {
    // The Joi validator only checks that req.body.course LOOKS like an ID.
    // Here we check that the course really exists and isn't deleted.
    const courseExists = await Course.exists({ _id: req.body.course, deletedAt: null });
    if (!courseExists) {
      return res.status(404).json({ message: "Course not found" });
    }

    const unit = await Unit.create(req.body);

    return res.status(201).json({
      message: "Unit created successfully",
      data: unit
    });
  } catch (error) {
    next(error);
  }
};

const updateUnit = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid unit ID" });
  }
  try {
    // If the update moves the unit to another course, that course must exist
    if (req.body.course) {
      const courseExists = await Course.exists({ _id: req.body.course, deletedAt: null });
      if (!courseExists) {
        return res.status(404).json({ message: "Course not found" });
      }
    }

    const updatedUnit = await Unit.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedUnit) {
      return res.status(404).json({
        message: `Unit with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({
      message: "Unit updated successfully",
      data: updatedUnit
    });
  } catch (error) {
    next(error);
  }
};

const deleteUnit = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid unit ID" });
  }
  try {
    // Soft delete, the same rule as for courses
    const deletedUnit = await Unit.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedUnit) {
      return res.status(404).json({
        message: `Unit with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({ message: "Unit deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createUnit, updateUnit, deleteUnit };