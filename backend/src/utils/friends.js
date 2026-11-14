const Friendship = require("../models/friendship.models");

// What other students see of a student: a display name and an avatar, never the full name or email.
// Without a display name, only the first word of the name is used.
const displayNameOf = (user) => user.displayName || String(user.name || "Student").trim().split(/\s+/)[0] || "Student";

const areFriends = (a, b) => Friendship.exists({
  status: "accepted",
  $or: [{ requester: a, recipient: b }, { requester: b, recipient: a }]
}).then(Boolean);

// The ids of everyone this student is friends with.
const friendIdsOf = async (userId) => {
  const rows = await Friendship.find({ status: "accepted", $or: [{ requester: userId }, { recipient: userId }] }).select("requester recipient").lean();
  return rows.map((row) => (String(row.requester) === String(userId) ? row.recipient : row.requester));
};

module.exports = { displayNameOf, areFriends, friendIdsOf };
