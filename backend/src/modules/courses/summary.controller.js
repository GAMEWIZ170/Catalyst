const mongoose = require("mongoose");
const crypto = require("crypto");
const Unit = require("./unit.models");
const Lesson = require("./lesson.models");
const Material = require("./material.models");
const cloudinary = require("../../config/cloudinary");
const { buildUnitSummary } = require("../../utils/summaryPdf");

const MAX_BYTES = 10 * 1024 * 1024; // the same limit as an uploaded PDF material

const upload = (buffer) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({
    folder: "catalyst/materials",
    public_id: `${crypto.randomBytes(20).toString("hex").slice(0, 20)}.pdf`,
    unique_filename: false,
    overwrite: false,
    resource_type: "raw",
    timeout: 30000
  }, (error, result) => (error ? reject(error) : resolve(result)));
  stream.end(buffer);
});

// ADMIN: POST /admin/units/:id/summary-pdf  body { lesson? }
// Makes a PDF from the unit's published lessons and saves it as a PDF material on one of the unit's lessons
// (the one given, else the first). The material starts unpublished: check it, then publish it like any material.
// Asking again makes a new PDF; delete the old material if it is no longer wanted.
const createUnitSummary = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid unit ID" });
  try {
    const unit = await Unit.findOne({ _id: req.params.id, deletedAt: null }).populate("course", "code title deletedAt").lean();
    if (!unit || !unit.course || unit.course.deletedAt) return res.status(404).json({ message: "Unit not found" });
    const all = await Lesson.find({ unit: unit._id, deletedAt: null }).sort({ order: 1 }).select("title explanation isPublished").lean();
    const lessons = all.filter((lesson) => lesson.isPublished);
    if (!lessons.length) return res.status(409).json({ message: "This unit has no published lessons yet, so there is nothing to summarise" });
    const wanted = req.body && req.body.lesson;
    const target = wanted ? all.find((lesson) => String(lesson._id) === wanted) : all[0];
    if (!target) return res.status(404).json({ message: "That lesson is not in this unit" });

    const pdf = await buildUnitSummary({ courseCode: unit.course.code, courseTitle: unit.course.title, unitTitle: unit.title, lessons });
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return res.status(500).json({ message: "Could not make the PDF" });
    if (pdf.length > MAX_BYTES) return res.status(413).json({ message: "The summary is over 10 MB. Split the unit into smaller units." });

    let result;
    try {
      result = await upload(pdf);
    } catch {
      return res.status(502).json({ message: "Material upload failed" });
    }
    const last = await Material.findOne({ lesson: target._id, deletedAt: null }).sort({ order: -1 }).select("order").lean();
    const material = await Material.create({
      lesson: target._id,
      title: `${unit.title}: summary`.slice(0, 120),
      description: `Summary of ${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}, made on ${new Date().toISOString().slice(0, 10)}.`,
      kind: "file",
      file: { url: result.secure_url, publicId: result.public_id, format: "pdf", bytes: pdf.length },
      order: (last ? last.order : 0) + 1,
      isPublished: false
    });
    return res.status(201).json({ message: "Summary PDF created. It is unpublished until you publish it.", data: { material, lessonId: target._id, lessonCount: lessons.length } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createUnitSummary };
