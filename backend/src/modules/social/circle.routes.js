const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const { validateCircle, validateCircleInvite } = require("../../middlewares/validate");
const { overview, create, invite, accept, leave } = require("./circle.controller");

router.use(authenticate);

router.get("/", overview);
router.post("/", validateCircle, create);
router.post("/:id/invite", validateCircleInvite, invite);
router.post("/:id/accept", accept);
router.delete("/:id", leave); // leave a circle or decline an invite

module.exports = router;
