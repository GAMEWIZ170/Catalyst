const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const app = express();

// Behind a proxy (Render, Railway, nginx), set TRUST_PROXY to the number of proxies in front of the app
// so req.ip is the student's real address. Leave it unset when the app is reached directly.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
}

// imports
const logger = require("./middlewares/logger");
const errorHandler = require("./middlewares/error");
const notFound = require("./middlewares/notFound");
const generalLimiter = require("./middlewares/generalLimiter");

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const homeRoutes = require("./routes/home.routes");
const mistakeRoutes = require("./routes/mistake.routes");
const reviewRoutes = require("./routes/review.routes");
const topicRoutes = require("./routes/topic.routes");
const examRoutes = require("./routes/exam.routes");
const planRoutes = require("./routes/plan.routes");
const lessonRoutes = require("./routes/lesson.routes");
const questionRoutes = require("./routes/question.routes");
const progressRoutes = require("./routes/progress.routes");
const testRoutes = require("./routes/test.routes");
const adminRoutes = require("./routes/admin.routes");
const flashcardRoutes = require("./routes/flashcard.routes");
const materialRoutes = require("./routes/material.routes");
const studyRoutes = require("./routes/study.routes");
const notificationRoutes = require("./routes/notification.routes");

// middlewares that run on every request, in this order
app.use(helmet());                       // safe response headers
app.use(compression());                  // gzip the JSON, which is mostly repeated text
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
app.use("/api/v1/home", homeRoutes);
app.use("/api/v1/mistakes", mistakeRoutes);
app.use("/api/v1/review", reviewRoutes);
app.use("/api/v1/topics", topicRoutes);
app.use("/api/v1/plan", planRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1", examRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", flashcardRoutes);
app.use("/api/v1", materialRoutes);
app.use("/api/v1", studyRoutes);

// these two must come after all the routes, in this order
app.use(notFound);
app.use(errorHandler);

module.exports = app;
