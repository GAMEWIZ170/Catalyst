const mongoose = require("mongoose");
const XpEntry = require("../modules/gamification/xp.models");
const User = require("../modules/auth/user.models");
const { dayKey } = require("./day");

// What each kind of learning is worth, and the most one student can earn from it in one of their own days.
// XP never comes from minutes watched or idle time. Goal XP (daily 25, weekly 75) is paused while goals are off.
const RULES = {
  answer: { xp: 2, cap: 100 },       // a correct answer (+1 when first try). Once per question per day.
  review: { xp: 3, cap: 90 },        // a card or mistake reviewed when due
  lesson: { xp: 20, cap: 100 },      // a lesson completed. Once per lesson, ever.
  mastery: { xp: 15, cap: 60 },      // a mastery level reached. Once per lesson and level, ever.
  focus: { xp: 1, cap: 30 },         // counted focus minutes, 1 XP each
  challenge: { xp: 10, cap: 30 },    // a friend challenge played. Once per challenge.
  set_used: { xp: 5, cap: 50 }       // another student studied your community set. Once per student per set.
};

// XP needed to go from level n to n+1.
const stepCost = (n) => 100 + 25 * (n - 1);

// Levels never go down because XP never goes down.
const levelFor = (xp) => {
  let level = 1;
  let floor = 0;
  while (xp >= floor + stepCost(level)) {
    floor += stepCost(level);
    level += 1;
  }
  return { level, into: xp - floor, next: stepCost(level) };
};

// Gives XP if the rules allow it. Returns { gained, xp, level } or null when nothing was given.
// It never throws, so a problem here can never break the request that earned the XP.
const awardXp = async (userId, source, { timeZone, key = null, amount } = {}) => {
  try {
    const rule = RULES[source];
    if (!rule) return null;
    const day = dayKey(timeZone);
    if (key && await XpEntry.exists({ user: userId, source, key })) return null;
    const [today] = await XpEntry.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(userId)), source, day } },
      { $group: { _id: null, total: { $sum: "$xp" } } }
    ]);
    const gained = Math.min(Math.floor(amount ?? rule.xp), rule.cap - (today?.total || 0));
    if (gained <= 0) return null;
    try {
      await XpEntry.create({ user: userId, source, day, key, xp: gained });
    } catch (error) {
      if (error.code === 11000) return null; // the same award arrived twice at once
      throw error;
    }
    const user = await User.findByIdAndUpdate(userId, { $inc: { xp: gained } }, { returnDocument: "after" }).select("xp").lean();
    return { gained, xp: user.xp, level: levelFor(user.xp).level };
  } catch (error) {
    console.error("XP award failed:", error.message);
    return null;
  }
};

module.exports = { awardXp, levelFor, stepCost, RULES };
