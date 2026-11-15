const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const requireAccess = require("../middlewares/requireAccess");
const community = require("../controllers/community.controller");
const leaderboard = require("../controllers/leaderboard.controller");

router.use(authenticate, requireAccess);

// Declared before /:id so "filters" is never read as an id.
router.get("/", community.shelf);
router.get("/filters", community.shelfFilters);
router.get("/boards", leaderboard.boards);
router.get("/quizzes/:testId/leaderboard", leaderboard.quizBoard);
router.get("/:id", community.detail);
router.post("/:id/save", community.save);
router.delete("/:id/save", community.unsave);
router.post("/:id/copy", community.copy);
router.post("/:id/studied", community.studied);

module.exports = router;
