const Unit = require("../models/unit.models"); // Adjust path to your unit model
const mongoose = require("mongoose");

const createUnit = async (req, res, next) => {
    try {
        const unit = new Unit(req.body);
        await unit.save();

        return res.status(201).json({
            message: 'Unit created successfully',
            data: unit
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A unit with this code already exists"
            });
        }
        next(error);
    }
};

const getUnitByID = async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({
            message: 'Invalid unit ID'
        });
    }
    
    try {
        const unit = await Unit.findOne({ 
            _id: req.params.id, 
            isPublished: true 
        });

        if (!unit) {
            return res.status(404).json({
                message: `Unit with ID ${req.params.id} not found`
            });
        }

        return res.status(200).json({
            message: 'Unit retrieved successfully',
            data: unit
        });

    } catch (error) {
        next(error);
    }
};

const getAllUnits = async (req, res, next) => {
    try {
        const units = await Unit.find({ isPublished: true })
            .select("code title description")
            .sort({ code: 1 })
            .lean();

        return res.status(200).json({
            message: 'Units retrieved successfully',
            count: units.length,
            data: units
        });

    } catch (error) {
        next(error);
    }
};

const updateUnit = async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({
            message: 'Invalid unit ID'
        });
    }

    try {
        const updatedUnit = await Unit.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
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
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A unit with this code already exists"
            });
        }
        next(error);
    }
};

const deleteUnit = async (req, res, next) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({
            message: 'Invalid unit ID'
        });
    }

    try {
        const deletedUnit = await Unit.findByIdAndDelete(req.params.id);

        if (!deletedUnit) {
            return res.status(404).json({
                message: `Unit with ID ${req.params.id} not found`
            });
        }

        return res.status(200).json({
            message: "Unit deleted successfully",
            data: deletedUnit // Fixed variable reference from updatedCourse to deletedUnit
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { 
    createUnit, 
    getUnitByID, 
    getAllUnits,
    updateUnit,
    deleteUnit
};