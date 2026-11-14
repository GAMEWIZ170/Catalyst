const mongoose = require("mongoose");

// A student's "report a problem" on a question or a lesson. An admin answers it from the inbox,
// and the answer reaches the student as a notification.
const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: ["question", "lesson"], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true }, // the question or lesson id
  test: { type: mongoose.Schema.Types.ObjectId, default: null },    // for a question: its test, so the inbox can open the editor
  category: { type: String, enum: ["wrong_answer", "typo", "unclear", "other"], required: true },
  note: { type: String, default: "", trim: true, maxlength: 500 },
  title: { type: String, default: "", trim: true, maxlength: 200 },  // what it was about, kept in case the content changes
  link: { type: String, default: "" },                              // where the student's notification goes
  status: { type: String, enum: ["open", "resolved"], default: "open" },
  reply: { type: String, default: "", trim: true, maxlength: 1000 },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ user: 1, kind: 1, target: 1, status: 1 });

module.exports = mongoose.model("Report", reportSchema);
