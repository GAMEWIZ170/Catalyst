const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// imports
const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/error");
const notFound = require("./middlewares/notFound");

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const lessonRoutes = require("./routes/lesson.routes");
const questionRoutes = require("./routes/question.routes");
const progressRoutes = require("./routes/progress.routes");
const adminRoutes = require("./routes/admin.routes");

// middlewares that run on every request, in this order
app.use(helmet());                       // safe response headers
app.use(cors({
  origin: process.env.CLIENT_URL,        // only your frontend may call the API
  credentials: true                      // lets the browser send the login cookie
}));
app.use(express.json());                 // CHANGED: brackets added
app.use(cookieParser());                 // CHANGED: added, so req.cookies works
app.use(logger);

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/admin", adminRoutes);

// these two must come after all the routes, in this order
app.use(notFound);
app.use(errorHandler);

module.exports = app;
