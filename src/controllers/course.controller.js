const Course = require("../models/course.models");
const mongoose = require("mongoose");

const createCourse = async (req, res, next )=> {
    try{
        const course = new Course(req.body);

        await course.save()

        return res.status(200).json({
            message: 'Course created successfully',
            data: course
        });

    } catch(error){

        if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this code already exists"
      });
    }
        next(error);
    }
};


const getCourseByID = async (req, res, next )=> {

    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
        return res.status(400).json({
            message: 'Invalid course ID'
        });
    }
    try{
        const course = await Course.findOne({ 
            _id: req.params.id, 
            isPublished: true 
        });

        if (!course) {
            return res.status(404).json({
                message: `Course with ID ${req.params.id} not found`
            });
        }

        return res.status(200).json({
            message: 'Course created successfully',
            data: course
        });

    } catch(error){
        next(error);
    }
};

//work on this
const getAllCourses = async (req, res, next )=> {
    try{
        const courses = await Course.find({isPublished:true})
        .select("code title description")
        .sort({code: 1})
        .lean()

        return res.status(200).json({
            message: 'Course created successfully',
            count: courses.length,
            data: courses
        });

    } catch(error){
        next(error);
    }
};

const updateCourse = async (req, res, next) => {
 try {
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id,
        req.body,
        {
            new:true,
            runValidators: true
        }
    )

    if (!updatedCourse) {
            return res.status(404).json({
                message: `Course with ${req.params.id} not found`
            });
        }
        return res.status(200).json({
            message: "Course updated successfully",
            data: updatedCourse
        });

 } catch (error) {
    next(error)
 }
};


const deleteCourse = async (req, res, next) => {
    try {
        const deletedCourse = await Course.findByIdAndDelete(req.params.id)

        if (!deletedCourse) {
                return res.status(404).json({
                    message: `Course with ${req.params.id} not found`
                });
            }
            return res.status(200).json({
                message: "Course deleted successfully",
                data: deletedCourse
            });

 } catch (error) {
    next(error)
 }
};


module.exports = { 
        createCourse, 
        getCourseByID, 
        getAllCourses,
        updateCourse,
        deleteCourse
    };
    