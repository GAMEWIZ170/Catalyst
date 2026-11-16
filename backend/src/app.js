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

const authRoutes = require("./modules/auth/auth.routes");
const courseRoutes = require("./modules/courses/course.routes");
const homeRoutes = require("./modules/progress/home.routes");
const mistakeRoutes = require("./modules/assessments/mistake.routes");
const reviewRoutes = require("./modules/flashcards/review.routes");
const topicRoutes = require("./modules/courses/topic.routes");
const examRoutes = require("./modules/assessments/exam.routes");
const planRoutes = require("./modules/progress/plan.routes");
const lessonRoutes = require("./modules/courses/lesson.routes");
const questionRoutes = require("./modules/assessments/question.routes");
const progressRoutes = require("./modules/progress/progress.routes");
const testRoutes = require("./modules/assessments/test.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const flashcardRoutes = require("./modules/flashcards/flashcard.routes");
const materialRoutes = require("./modules/courses/material.routes");
const studyRoutes = require("./modules/progress/study.routes");
const notificationRoutes = require("./modules/social/notification.routes");
const reportRoutes = require("./modules/community/report.routes");
const eventRoutes = require("./modules/progress/event.routes");
const examDateRoutes = require("./modules/assessments/examdate.routes");
const studySetRoutes = require("./modules/lab/studyset.routes");
const xpRoutes = require("./modules/gamification/xp.routes");
const communityRoutes = require("./modules/community/community.routes");
const aiRoutes = require("./modules/lab/ai.routes");
const circleRoutes = require("./modules/social/circle.routes");
const shareRoutes = require("./modules/community/share.routes");
const challengeRoutes = require("./modules/social/challenge.routes");
const friendRoutes = require("./modules/social/friend.routes");
const achievementRoutes = require("./modules/gamification/achievement.routes");

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
app.use("/s", shareRoutes); // public share links with preview tags (see share.controller.js)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/home", homeRoutes);
app.use("/api/v1/mistakes", mistakeRoutes);
app.use("/api/v1/review", reviewRoutes);
app.use("/api/v1/topics", topicRoutes);
app.use("/api/v1/plan", planRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/my-exams", examDateRoutes);
app.use("/api/v1/study-sets", studySetRoutes);
app.use("/api/v1/xp", xpRoutes);
app.use("/api/v1/community", communityRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/circles", circleRoutes);
app.use("/api/v1/challenges", challengeRoutes);
app.use("/api/v1/friends", friendRoutes);
app.use("/api/v1/achievements", achievementRoutes);
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
