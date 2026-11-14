const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { validateBookmark, validateNote } = require("../middlewares/validate");
const { search, listBookmarks, saveBookmark, removeBookmark, saveNote } = require("../controllers/study.controller");

router.use(authenticate);

router.get("/search", search);
router.get("/bookmarks", listBookmarks);
router.put("/bookmarks", validateBookmark, saveBookmark);
router.delete("/bookmarks/:kind/:id", removeBookmark);
router.put("/notes/:lessonId", validateNote, saveNote);

module.exports = router;
