const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const friendLimiter = require("../middlewares/friendLimiter");
const { validateFriendRequest, validateFriendSettings } = require("../middlewares/validate");
const { overview, sendRequest, acceptRequest, remove, updateSettings } = require("../controllers/friend.controller");

router.use(authenticate);

router.get("/", overview);
router.put("/settings", validateFriendSettings, updateSettings); // before /:id so "settings" is never read as an id
router.post("/requests", friendLimiter, validateFriendRequest, sendRequest);
router.post("/requests/:id/accept", acceptRequest);
router.delete("/:id", remove);

module.exports = router;
