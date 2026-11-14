const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { list, markRead, markAllRead } = require("../controllers/notification.controller");

router.use(authenticate);

router.get("/", list);
router.post("/read-all", markAllRead); // before /:id/read so "read-all" is never read as an id
router.post("/:id/read", markRead);

module.exports = router;
