const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// imports
const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/error");
const notFound = require("./middlewares/notFound");
const generalLimiter = require("./middlewares/generalLimiter");

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const lessonRoutes = require("./routes/lesson.routes");
const questionRoutes = require("./routes/question.routes");
const progressRoutes = require("./routes/progress.routes");
const testRoutes = require("./routes/test.routes");
const adminRoutes = require("./routes/admin.routes");
const flashcardRoutes = require("./routes/flashcard.routes");
const materialRoutes = require("./routes/material.routes");

// middlewares that run on every request, in this order
app.use(helmet());                       // safe response headers
app.use(cors({
  origin: process.env.CLIENT_URL,        // only your frontend may call the API
  credentials: true                      // lets the browser send the login cookie
}));
app.use(express.json());
app.use(cookieParser());
app.use(logger);
app.use(generalLimiter);

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", flashcardRoutes);
app.use("/api/v1", materialRoutes);

// these two must come after all the routes, in this order
app.use(notFound);
app.use(errorHandler);

module.exports = app;
