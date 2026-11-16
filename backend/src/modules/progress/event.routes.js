const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const { validateEvent } = require("../../middlewares/validate");
const { addEvent } = require("./event.controller");

router.post("/", authenticate, validateEvent, addEvent);

module.exports = router;
