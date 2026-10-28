const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
    unit: {type:mongoose.Schema.Types.ObjectId,
        ref:"Unit",
        required: true
    },
    title: {type:String,
        required: true
    },
    order: {type:Number,
        required: true
    },
    explanation: {type:String,
        required: true
    },
    videoHost: {type:String,
        default: ""
    },
    videoId: {type:String,
        default: ""
    },
    isPublished: {type:Boolean,
        default: false
    }
},
{timestamps:true});


lessonSchema.index({ title: 'text' });

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson
