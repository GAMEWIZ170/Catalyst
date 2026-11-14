const mongoose = require("mongoose");
const Circle = require("../models/circle.models");
const Friendship = require("../models/friendship.models");
const Notification = require("../models/notification.models");
const Progress = require("../models/progress.models");
const TestResult = require("../models/testresult.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const User = require("../models/user.models");
const { dayKey, weekStart } = require("../utils/day");
const { displayNameOf } = require("../utils/friends");

const MAX_MEMBERS = 6;
const MAX_CIRCLES = 10; // per student, so nobody can fill the database with empty circles
const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const same = (a, b) => String(a) === String(b);

// The days each member studied this week (the same activity the streak and the weekly goal use).
const studyDays = async (userIds, monday, today) => {
  const filter = (field) => ({ user: { $in: userIds }, [field]: { $elemMatch: { $gte: monday, $lte: today } } });
  const [progress, results, cards] = await Promise.all([
    Progress.find(filter("completedDays")).select("user completedDays").lean(),
    TestResult.find(filter("completedDays")).select("user completedDays").lean(),
    FlashcardProgress.find(filter("reviewedDays")).select("user reviewedDays").lean()
  ]);
  const byUser = new Map();
  const add = (user, days) => {
    const set = byUser.get(String(user)) || new Set();
    for (const day of days || []) if (day >= monday && day <= today) set.add(day);
    byUser.set(String(user), set);
  };
  progress.forEach((row) => add(row.user, row.completedDays));
  results.forEach((row) => add(row.user, row.completedDays));
  cards.forEach((row) => add(row.user, row.reviewedDays));
  return byUser;
};

// One circle as the viewer sees it. Members show a display name and avatar only. The bar is the circle's combined
// study days against goalDays for every joined member: nobody sees who studied more, and a quiet member is not named.
const present = async (circle, viewer, timeZone) => {
  const today = dayKey(timeZone);
  const monday = weekStart(today);
  const people = await User.find({ _id: { $in: circle.members.map((m) => m.user) } }).select("name displayName avatar").lean();
  const byId = new Map(people.map((p) => [String(p._id), p]));
  const joined = circle.members.filter((m) => m.status === "joined");
  const days = joined.length ? await studyDays(joined.map((m) => m.user), monday, today) : new Map();
  const target = circle.goalDays * joined.length;
  // Each member's days count up to goalDays, so one very busy member cannot carry the whole circle.
  const done = joined.reduce((sum, m) => sum + Math.min(circle.goalDays, days.get(String(m.user))?.size || 0), 0);
  const mine = circle.members.find((m) => same(m.user, viewer));
  return {
    id: circle._id, name: circle.name, goalDays: circle.goalDays, owner: same(circle.owner, viewer), status: mine?.status || null,
    members: circle.members.map((m) => ({ name: displayNameOf(byId.get(String(m.user)) || {}), avatar: byId.get(String(m.user))?.avatar || null, status: m.status, you: same(m.user, viewer) })),
    progress: joined.length >= 2 ? { done, target, met: done >= target } : null
  };
};

const overview = async (req, res, next) => {
  try {
    const circles = await Circle.find({ "members.user": req.user.id }).sort({ updatedAt: -1 }).limit(MAX_CIRCLES + 10).lean();
    const data = await Promise.all(circles.map((circle) => present(circle, req.user.id, req.user.timeZone)));
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    if (await Circle.countDocuments({ "members.user": req.user.id }) >= MAX_CIRCLES) return res.status(409).json({ message: "You are in the most circles allowed. Leave one first." });
    const circle = await Circle.create({ name: req.body.name, goalDays: req.body.goalDays, owner: req.user.id, members: [{ user: req.user.id, status: "joined" }] });
    return res.status(201).json({ data: await present(circle.toObject(), req.user.id, req.user.timeZone) });
  } catch (error) {
    next(error);
  }
};

// The owner invites one of their friends. `friendship` is the id shown in the friends list.
const invite = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid circle ID" });
    const circle = await Circle.findOne({ _id: req.params.id, owner: req.user.id });
    if (!circle) return res.status(404).json({ message: "Circle not found" });
    const row = await Friendship.findOne({ _id: req.body.friendship, status: "accepted", $or: [{ requester: req.user.id }, { recipient: req.user.id }] }).lean();
    if (!row) return res.status(404).json({ message: "Friend not found" });
    const friend = same(row.requester, req.user.id) ? row.recipient : row.requester;
    if (circle.members.some((m) => same(m.user, friend))) return res.status(409).json({ message: "They are already in this circle" });
    if (circle.members.length >= MAX_MEMBERS) return res.status(409).json({ message: `A circle has up to ${MAX_MEMBERS} people` });
    if (await Circle.countDocuments({ "members.user": friend }) >= MAX_CIRCLES) return res.status(409).json({ message: "They are in the most circles allowed" });
    circle.members.push({ user: friend, status: "invited" });
    await circle.save();
    const me = await User.findById(req.user.id).select("name displayName").lean();
    await Notification.create({
      user: friend, type: "circle", key: `circle:${circle._id}:${friend}`, title: "Study circle invite",
      body: `${displayNameOf(me)} invited you to the circle "${circle.name}".`, link: "/circles"
    }).catch((error) => { if (error.code !== 11000) console.error("Circle notification failed:", error.message); });
    return res.status(200).json({ message: "Invite sent" });
  } catch (error) {
    next(error);
  }
};

const accept = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid circle ID" });
    const done = await Circle.updateOne({ _id: req.params.id, members: { $elemMatch: { user: req.user.id, status: "invited" } } }, { $set: { "members.$.status": "joined" } });
    if (!done.matchedCount) return res.status(404).json({ message: "Invite not found" });
    return res.status(200).json({ message: "You joined the circle" });
  } catch (error) {
    next(error);
  }
};

// Leaves a circle, or declines an invite. When the owner leaves, the longest-standing joined member becomes the
// owner. A circle with nobody left is removed.
const leave = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid circle ID" });
    const circle = await Circle.findOne({ _id: req.params.id, "members.user": req.user.id });
    if (!circle) return res.status(404).json({ message: "Circle not found" });
    circle.members = circle.members.filter((m) => !same(m.user, req.user.id));
    const joined = circle.members.filter((m) => m.status === "joined");
    if (!joined.length) {
      await Circle.deleteOne({ _id: circle._id });
    } else {
      if (same(circle.owner, req.user.id)) circle.owner = joined[0].user;
      await circle.save();
    }
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { overview, create, invite, accept, leave };
