const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const { validateExamDate } = require("../../middlewares/validate");
const { list, create, remove } = require("./examdate.controller");

router.use(authenticate);

router.get("/", list);
router.post("/", validateExamDate, create);
router.delete("/:id", remove);

module.exports = router;
