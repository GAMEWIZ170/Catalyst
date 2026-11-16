const mongoose = require("mongoose");
const StudySet = require("../modules/lab/studyset.models");
const User = require("../modules/auth/user.models");
const { displayNameOf } = require("./friends");

// A study set this student may look at: their own, or one its owner shared by link or with the community and that was not
// taken down. Everything else is null, which the routes answer with 404, so a private set looks like one that does not exist.
const findSharedSet = (id, viewerId) => {
  if (!mongoose.isObjectIdOrHexString(String(id))) return null;
  return StudySet.findOne({
    _id: id, deletedAt: null,
    $or: [{ owner: viewerId }, { visibility: { $in: ["link", "community"] }, communityStatus: { $ne: "removed" } }]
  });
};

// The names other students see for a list of owners: a display name, or the first name. Never a full name or email.
const authorNames = async (ownerIds) => {
  const users = await User.find({ _id: { $in: ownerIds } }).select("name displayName deletedAt").lean();
  return new Map(users.map((user) => [String(user._id), user.deletedAt ? "A student" : displayNameOf(user)]));
};

module.exports = { findSharedSet, authorNames };
