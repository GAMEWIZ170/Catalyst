const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/user.models");
const Friendship = require("../models/friendship.models");
const Notification = require("../models/notification.models");
const { levelFor } = require("../utils/xp");
const { displayNameOf } = require("../utils/friends");

// No 0, O, 1, I or L, so a code read out loud or typed from a phone cannot be mixed up.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.randomBytes(8), (byte) => ALPHABET[byte % ALPHABET.length]).join("");

const ensureCode = async (userId, existing) => {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      const done = await User.updateOne({ _id: userId, friendCode: null }, { $set: { friendCode: code } });
      if (done.matchedCount) return code;
      return (await User.findById(userId).select("friendCode").lean()).friendCode; // another tab made it first
    } catch (error) {
      if (error.code !== 11000) throw error; // that code is taken: try another
    }
  }
  throw new Error("Could not make a friend code");
};

const person = (user, rowId) => ({ id: rowId, name: displayNameOf(user), avatar: user.avatar || null });

// STUDENT: my code and settings, my friends, and the requests waiting. A friend who hides their activity shows
// a name and avatar only. Nobody who is not a friend ever sees a level.
const overview = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).select("friendCode displayName name hideActivity").lean();
    const code = await ensureCode(req.user.id, me.friendCode);
    const rows = await Friendship.find({ $or: [{ requester: req.user.id }, { recipient: req.user.id }] })
      .populate("requester recipient", "name displayName avatar xp hideActivity isActive deletedAt").sort({ updatedAt: -1 }).lean();
    const mine = String(req.user.id);
    const friends = [];
    const incoming = [];
    const outgoing = [];
    for (const row of rows) {
      const sentByMe = String(row.requester._id) === mine;
      const other = sentByMe ? row.recipient : row.requester;
      if (!other || other.deletedAt || other.isActive === false) continue;
      if (row.status === "accepted") {
        friends.push({ ...person(other, row._id), level: other.hideActivity ? null : levelFor(other.xp || 0).level });
      } else if (sentByMe) {
        outgoing.push(person(other, row._id));
      } else {
        incoming.push(person(other, row._id));
      }
    }
    return res.status(200).json({ data: { me: { code, displayName: me.displayName || "", defaultName: displayNameOf({ name: me.name }), hideActivity: Boolean(me.hideActivity) }, friends, incoming, outgoing } });
  } catch (error) {
    next(error);
  }
};

const sendRequest = async (req, res, next) => {
  try {
    const target = await User.findOne({ friendCode: req.body.code, isActive: { $ne: false }, deletedAt: null }).select("_id notify").lean();
    // The same answer for a code that does not exist and for the student's own code.
    if (!target || String(target._id) === String(req.user.id)) return res.status(404).json({ message: "No student has that code" });
    const existing = await Friendship.findOne({ $or: [{ requester: req.user.id, recipient: target._id }, { requester: target._id, recipient: req.user.id }] });
    if (existing) {
      if (existing.status === "accepted") return res.status(409).json({ message: "You are already friends" });
      if (String(existing.recipient) === String(req.user.id)) {
        // They already asked me, so adding them back is accepting.
        existing.status = "accepted";
        await existing.save();
        return res.status(200).json({ message: "You are now friends" });
      }
      return res.status(409).json({ message: "You already sent a request. They need to accept it." });
    }
    const request = await Friendship.create({ requester: req.user.id, recipient: target._id });
    const sender = await User.findById(req.user.id).select("name displayName").lean();
    await Notification.create({
      user: target._id, type: "friend", key: `friend:${request._id}`, title: "Friend request",
      body: `${displayNameOf(sender)} wants to be friends on Catalyst.`, link: "/friends"
    }).catch((error) => console.error("Friend notification failed:", error.message));
    return res.status(201).json({ message: "Request sent" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You already sent a request. They need to accept it." });
    next(error);
  }
};

const badId = (id) => !mongoose.isObjectIdOrHexString(id);

const acceptRequest = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    const done = await Friendship.updateOne({ _id: req.params.id, recipient: req.user.id, status: "pending" }, { $set: { status: "accepted" } });
    if (!done.matchedCount) return res.status(404).json({ message: "Request not found" });
    return res.status(200).json({ message: "You are now friends" });
  } catch (error) {
    next(error);
  }
};

// Removes a friend, declines a request, or cancels one I sent. Either side may do it.
const remove = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    const done = await Friendship.deleteOne({ _id: req.params.id, $or: [{ requester: req.user.id }, { recipient: req.user.id }] });
    if (!done.deletedCount) return res.status(404).json({ message: "Not found" });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const set = {};
    if (req.body.displayName !== undefined) set.displayName = req.body.displayName || null;
    if (req.body.hideActivity !== undefined) set.hideActivity = req.body.hideActivity;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: set }, { returnDocument: "after" }).select("displayName hideActivity name").lean();
    return res.status(200).json({ data: { displayName: user.displayName || "", defaultName: displayNameOf({ name: user.name }), hideActivity: Boolean(user.hideActivity) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { overview, sendRequest, acceptRequest, remove, updateSettings };
