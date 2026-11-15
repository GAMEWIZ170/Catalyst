const mongoose = require("mongoose");
const StudySet = require("../models/studyset.models");
const Report = require("../models/report.models");
const Notification = require("../models/notification.models");
const { authorNames } = require("../utils/sharedSet");
const { itemCount } = require("./community.controller");

const badId = (id) => !mongoose.isObjectIdOrHexString(String(id));
const PAGE = 30;

const message = (userId, key, title, body, link) =>
  Notification.create({ user: userId, type: "community", key, title, body: String(body).slice(0, 300), link })
    .catch((error) => { if (error.code !== 11000) console.error("Community notification failed:", error.message); });

// ADMIN: sets waiting for approval (?view=pending, oldest first), sets with open reports (?view=reported) or live sets (?view=live).
const list = async (req, res, next) => {
  try {
    const view = ["reported", "live"].includes(req.query.view) ? req.query.view : "pending";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let filter;
    let reportCounts = new Map();
    if (view === "reported") {
      const rows = await Report.aggregate([{ $match: { kind: "set", status: "open" } }, { $group: { _id: "$target", n: { $sum: 1 } } }]);
      reportCounts = new Map(rows.map((row) => [String(row._id), row.n]));
      filter = { _id: { $in: rows.map((row) => row._id) }, deletedAt: null };
    } else if (view === "live") {
      filter = { communityStatus: "approved", visibility: "community", deletedAt: null };
    } else {
      filter = { communityStatus: "pending", deletedAt: null };
    }
    const [sets, total, pending, reported] = await Promise.all([
      StudySet.find(filter).sort(view === "pending" ? { submittedAt: 1 } : { updatedAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
      StudySet.countDocuments(filter),
      StudySet.countDocuments({ communityStatus: "pending", deletedAt: null }),
      Report.distinct("target", { kind: "set", status: "open" }).then((ids) => ids.length)
    ]);
    const names = await authorNames(sets.map((set) => set.owner));
    const items = await Promise.all(sets.map(async (set) => ({
      id: set._id, title: set.title, description: set.description, topic: set.topic, author: names.get(String(set.owner)) || "A student",
      communityStatus: set.communityStatus, submittedAt: set.submittedAt, declaredAt: set.declaredAt, studied: set.studiedCount, saved: set.savedCount,
      openReports: reportCounts.get(String(set._id)) || 0, items: (await itemCount(set._id)).total
    })));
    return res.status(200).json({ data: { view, counts: { pending, reported }, page, pages: Math.max(1, Math.ceil(total / PAGE)), items } });
  } catch (error) {
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid set ID" });
    const set = await StudySet.findOneAndUpdate(
      { _id: req.params.id, communityStatus: "pending", deletedAt: null },
      { $set: { communityStatus: "approved", visibility: "community", reviewedAt: new Date(), reviewedBy: req.user.id, reviewNote: "" } },
      { returnDocument: "after" }
    );
    if (!set) return res.status(404).json({ message: "No set waiting for approval with that ID" });
    await message(set.owner, `community:${set._id}:approved:${Date.now()}`, "Your set is on the community shelf", `"${set.title}" was approved. Other students can find it now.`, `/community/${set._id}`);
    return res.status(200).json({ message: "Approved" });
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid set ID" });
    const note = req.body.note || "";
    const set = await StudySet.findOneAndUpdate(
      { _id: req.params.id, communityStatus: "pending", deletedAt: null },
      { $set: { communityStatus: "rejected", visibility: "private", reviewedAt: new Date(), reviewedBy: req.user.id, reviewNote: note } },
      { returnDocument: "after" }
    );
    if (!set) return res.status(404).json({ message: "No set waiting for approval with that ID" });
    await message(set.owner, `community:${set._id}:rejected:${Date.now()}`, "Your set was not approved", note || `"${set.title}" was not approved for the community shelf. You can improve it and send it again.`, `/lab/${set._id}`);
    return res.status(200).json({ message: "Rejected" });
  } catch (error) {
    next(error);
  }
};

// Takes a set off the community for good: it goes back to private, cannot be shared there again, and every open report
// on it is resolved (the reporters are told). The owner keeps their own copy in the Lab.
const takedown = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid set ID" });
    const reason = req.body.reason || "";
    const set = await StudySet.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null, communityStatus: { $in: ["approved", "pending"] } },
      { $set: { communityStatus: "removed", visibility: "private", reviewedAt: new Date(), reviewedBy: req.user.id, removedReason: reason } },
      { returnDocument: "after" }
    );
    if (!set) return res.status(404).json({ message: "That set is not on the community shelf" });
    const reports = await Report.find({ kind: "set", target: set._id, status: "open" }).select("user title").lean();
    await Report.updateMany({ kind: "set", target: set._id, status: "open" }, { $set: { status: "resolved", reply: "The set was taken down.", resolvedAt: new Date(), resolvedBy: req.user.id } });
    await Promise.all(reports.map((report) => message(report.user, `report:${report._id}`, "Your report was answered", "Thanks. The set you reported was taken down.", "/community")));
    await message(set.owner, `community:${set._id}:removed:${Date.now()}`, "Your set was removed from the community", reason || `"${set.title}" broke the community rules and was removed. It is still in your Study Lab.`, `/lab/${set._id}`);
    return res.status(200).json({ message: "Taken down" });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, approve, reject, takedown };
