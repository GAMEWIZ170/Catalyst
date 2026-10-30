const mongoose = require('mongoose');

const connectDB = async () =>{
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB connection successful");
    } catch(error){
        console.error("DB connection unsuccessful ",error);
        process.exit(1);
    }
}

module.exports = connectDB;