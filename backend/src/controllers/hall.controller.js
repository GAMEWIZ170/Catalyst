const HallPresence = require("../models/hallpresence.models");

const ACTIVE_MS = 90 * 1000; // a heartbeat comes every 30 seconds, so three missed ones mean the student left

const focusingCount = () => HallPresence.countDocuments({ lastSeen: { $gte: new Date(Date.now() - ACTIVE_MS) } });

// STUDENT: how many are focusing now, and whether this student is in. Never names anyone.
const status = async (req, res, next) => {
  try {
    const [focusing, mine] = await Promise.all([focusingCount(), HallPresence.findOne({ user: req.user.id, lastSeen: { $gte: new Date(Date.now() - ACTIVE_MS) } }).select("goal").lean()]);
    return res.status(200).json({ data: { focusing, joined: Boolean(mine), goal: mine?.goal || "" } });
  } catch (error) {
    next(error);
  }
};

// Joins the hall, or keeps the place (the page sends this every 30 seconds while the student is in).
const heartbeat = async (req, res, next) => {
  try {
    await HallPresence.updateOne({ user: req.user.id }, { $set: { goal: req.body.goal, lastSeen: new Date() } }, { upsert: true });
    return res.status(200).json({ data: { focusing: await focusingCount(), joined: true, goal: req.body.goal } });
  } catch (error) {
    next(error);
  }
};

const leave = async (req, res, next) => {
  try {
    await HallPresence.deleteOne({ user: req.user.id });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { status, heartbeat, leave };
