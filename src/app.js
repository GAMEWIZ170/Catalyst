const express = require("express");

const app = express();

//imports

const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/error");


app.use(express.json)

app.use(logger)

//routes

//middlewares


app.use(errorHandler);

module.exports = app;
