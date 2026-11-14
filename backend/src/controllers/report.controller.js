const mongoose = require("mongoose");
const Report = require("../models/report.models");
const Question = require("../models/question.models");
const Notification = require("../models/notification.models");
const { findVisibleLesson, findVisibleTest } = require("../utils/visibility");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const PAGE = 30;

// STUDENT: report a problem on a question or lesson they can see.
// One open report per student per item: asking twice says so instead of filling the inbox.
const createReport = async (req, res, next) => {
  try {
    const { kind, target, category, note } = req.body;
    let title = "";
    let link = "";
    let test = null;
    if (kind === "lesson") {
      const lesson = await findVisibleLesson(target);
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      title = lesson.title;
      link = `/lessons/${lesson._id}`;
    } else {
      const question = await Question.findOne({ _id: target, deletedAt: null }).select("text test").lean();
      const visibleTest = question && question.test ? await findVisibleTest(question.test) : null;
      if (!visibleTest) return res.status(404).json({ message: "Question not found" });
      title = `${visibleTest.title}: ${question.text}`.slice(0, 200);
      link = `/tests/${visibleTest._id}`;
      test = visibleTest._id;
    }
    if (await Report.exists({ user: req.user.id, kind, target, status: "open" })) {
      return res.status(409).json({ message: "You already reported this. We will look at it soon." });
    }
    await Report.create({ user: req.user.id, kind, target, test, category, note: note || "", title, link });
    return res.status(201).json({ message: "Thank you. Your report was sent." });
  } catch (error) {
    next(error);
  }
};

const editorLink = (report) => (report.kind === "lesson" ? `/admin/lessons/${report.target}` : report.test ? `/admin/tests/${report.test}` : null);

// ADMIN: the inbox. ?status=open|resolved (default open), ?page=1.
const listReports = async (req, res, next) => {
  try {
    const status = req.query.status === "resolved" ? "resolved" : "open";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const [items, total, open, resolved] = await Promise.all([
      Report.find({ status }).sort(status === "open" ? { createdAt: 1 } : { resolvedAt: -1 })
        .skip((page - 1) * PAGE).limit(PAGE).populate("user", "name").lean(),
      Report.countDocuments({ status }),
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "resolved" })
    ]);
    return res.status(200).json({
      data: {
        counts: { open, resolved }, page, pages: Math.max(1, Math.ceil(total / PAGE)),
        items: items.map((r) => ({
          id: r._id, kind: r.kind, category: r.category, note: r.note, title: r.title, status: r.status, reply: r.reply,
          createdAt: r.createdAt, resolvedAt: r.resolvedAt, student: r.user ? r.user.name : "Deleted user", editorLink: editorLink(r)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: mark a report resolved, with an optional reply. The student always gets a notification.
const resolveReport = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid report ID" });
  try {
    const reply = req.body.reply || "";
    // Claim it first, so two admins clicking at once send one notification.
    const report = await Report.findOneAndUpdate(
      { _id: req.params.id, status: "open" },
      { $set: { status: "resolved", reply, resolvedAt: new Date(), resolvedBy: req.user.id } },
      { returnDocument: "after" }
    ).lean();
    if (!report) {
      const exists = await Report.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({ message: exists ? "This report is already resolved" : "Report not found" });
    }
    try {
      await Notification.create({
        user: report.user, type: "report", key: `report:${report._id}`,
        title: "Your report was answered",
        body: (reply || `Thanks. We looked at "${report.title}".`).slice(0, 300),
        link: report.link || "/courses"
      });
    } catch (error) {
      if (error.code !== 11000) console.error("Report notification failed:", error.message);
    }
    return res.status(200).json({ message: "Report resolved" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReport, listReports, resolveReport };
