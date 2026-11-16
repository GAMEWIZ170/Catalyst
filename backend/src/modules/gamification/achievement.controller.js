const AchievementUnlock = require("./achievement.models");
const { LIST, evaluate } = require("../../utils/achievements");
const { loadActiveDays } = require("../progress/progress.controller");

// STUDENT: every achievement with whether it is earned. A hidden one shows only "Hidden achievement" until earned.
const listMine = async (req, res, next) => {
  try {
    await evaluate(req.user.id, await loadActiveDays(req.user.id));
    const rows = await AchievementUnlock.find({ user: req.user.id }).lean();
    const when = new Map(rows.map((row) => [row.key, row.unlockedAt]));
    const data = LIST.map((item) => {
      const unlockedAt = when.get(item.key) || null;
      const hide = item.hidden && !unlockedAt;
      return { key: item.key, title: hide ? "Hidden achievement" : item.title, text: hide ? "Keep learning to find this one." : item.text, hidden: Boolean(item.hidden), unlockedAt };
    });
    return res.status(200).json({ data, earned: rows.length, total: LIST.length });
  } catch (error) {
    next(error);
  }
};

// The student has seen the "earned" messages, so they are not shown again.
const markSeen = async (req, res, next) => {
  try {
    await AchievementUnlock.updateMany({ user: req.user.id, seen: false }, { $set: { seen: true } });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { listMine, markSeen };
