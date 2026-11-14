const mongoose = require("mongoose");

// A friend challenge: up to 10 questions from one test, played once by the student who made it and once by a friend,
// within 48 hours of being made. Played one after the other (no live rooms). Answers are graded on the server.
const resultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  correct: { type: Number, min: 0, required: true },
  total: { type: Number, min: 0, required: true },
  finishedAt: { type: Date, default: Date.now }
}, { _id: false });

const challengeSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  opponent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // the friend who plays it first
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  title: { type: String, default: "", maxlength: 200 },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  expiresAt: { type: Date, required: true },
  results: { type: [resultSchema], default: [] },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null } // set when both played and one scored more
}, { timestamps: true });

challengeSchema.index({ creator: 1, createdAt: -1 });
challengeSchema.index({ "results.user": 1, createdAt: -1 });
challengeSchema.index({ winner: 1 }, { partialFilterExpression: { winner: { $type: "objectId" } } });

module.exports = mongoose.model("Challenge", challengeSchema);
