const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    code: {type:String,
        required: true, 
        unique: true, 
        trim:true
    },
    title: {type:String,
        required: true
    },
    description: {type:String,
        required: true
    },
    isPublished: {type:Boolean,
        default: false
    }
},
{timestamps:true});


courseSchema.index({ title: 'text' });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course
