const User = require("../models/user.models");
const { levelFor } = require("../utils/xp");

const summary = (user) => {
  const xp = user?.xp || 0;
  const { level, into, next } = levelFor(xp);
  return { xp, level, into, next, pendingLevelUp: level > (user?.xpLevelSeen || 1) ? level : null };
};

const getMyXp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("xp xpLevelSeen").lean();
    return res.status(200).json({ data: summary(user) });
  } catch (error) {
    next(error);
  }
};

// The student has seen the level-up panel, so it is not shown again.
const markLevelSeen = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("xp xpLevelSeen").lean();
    await User.updateOne({ _id: req.user.id }, { $max: { xpLevelSeen: levelFor(user?.xp || 0).level } });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyXp, markLevelSeen };
