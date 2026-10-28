const express = require("express");

const app = express();

//imports

const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/error");

const courseRoutes = require("./routes/course.routes");


app.use(express.json)

app.use(logger)

//routes

app.use('/api/courses', courseRoutes);

//middlewares


app.use(errorHandler);

module.exports = app;
