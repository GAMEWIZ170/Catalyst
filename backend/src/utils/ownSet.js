const mongoose = require("mongoose");
const StudySet = require("../modules/lab/studyset.models");

// The study set with this id, only if it is not deleted and belongs to this student. Everyone else gets null,
// which the routes answer with 404, so a private set looks the same as one that does not exist.
const findOwnSet = async (id, userId) => {
  if (!mongoose.isObjectIdOrHexString(String(id))) return null;
  return StudySet.findOne({ _id: id, owner: userId, deletedAt: null });
};

module.exports = { findOwnSet };
