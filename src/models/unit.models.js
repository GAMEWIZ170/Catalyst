const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
    course: {type:mongoose.Schema.Types.ObjectId,
        ref:"Course",
        required: true
    },
    title: {type:String,
        required:true
    },
    order: {type:Number,
        required: true
    },
},
{timestamps:true});


unitSchema.index({ title: 'text' });

const Unit = mongoose.model('Unit', unitSchema);

module.exports = Unit
