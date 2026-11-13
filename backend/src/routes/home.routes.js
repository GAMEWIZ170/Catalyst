const express = require("express");
const router = express.Router();

const authenticate = require("../middlewares/authenticate");
const { getHome } = require("../controllers/home.controller");

router.use(authenticate);

router.get("/", getHome);

module.exports = router;
