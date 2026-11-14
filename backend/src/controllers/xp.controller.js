const User = require("../models/user.models");
const AchievementUnlock = require("../models/achievement.models");
const { levelFor } = require("../utils/xp");
const { evaluate, byKey } = require("../utils/achievements");
const { loadActiveDays } = require("./progress.controller");

const CHECK_EVERY_MS = 60 * 1000;

const summary = (user) => {
  const xp = user?.xp || 0;
  const { level, into, next } = levelFor(xp);
  return { xp, level, into, next, pendingLevelUp: level > (user?.xpLevelSeen || 1) ? level : null };
};

const getMyXp = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("xp xpLevelSeen achievementsCheckedAt").lean();
    // The shell asks on every page change, so achievements are only worked out when the last check is over a minute old.
    if (!user?.achievementsCheckedAt || Date.now() - user.achievementsCheckedAt.getTime() > CHECK_EVERY_MS) {
      await evaluate(req.user.id, await loadActiveDays(req.user.id));
    }
    const unseen = await AchievementUnlock.find({ user: req.user.id, seen: false }).select("key -_id").lean();
    return res.status(200).json({ data: { ...summary(user), newAchievements: unseen.map((row) => ({ key: row.key, title: byKey.get(row.key)?.title })).filter((row) => row.title) } });
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
