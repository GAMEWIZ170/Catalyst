const mongoose = require("mongoose");
const crypto = require("crypto");
const Material = require("../models/material.models");
const Lesson = require("../models/lesson.models");
const cloudinary = require("../config/cloudinary");
const { findVisibleLesson, parentIsAvailable } = require("../utils/visibility");
const materialUrl = require("../utils/materialUrl");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const createMaterial = async (req, res, next) => {
  try {
    if (!(await parentIsAvailable("lesson", req.body.lesson))) return res.status(404).json({ message: "Lesson not found" });
    const last = await Material.findOne({ lesson: req.body.lesson, deletedAt: null }).sort({ order: -1 }).select("order").lean();
    const material = await Material.create({ ...req.body, order: req.body.order || (last?.order || 0) + 1 });
    return res.status(201).json({ message: "Material created successfully", data: material });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};
const updateMaterial = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid material ID" });
  try {
    const material = await Material.findOne({ _id: req.params.id, deletedAt: null });
    if (!material) return res.status(404).json({ message: "Material not found" });
    if (req.body.kind && req.body.kind !== material.kind) return res.status(400).json({ message: "Material kind cannot be changed" });
    if (req.body.lesson && !(await parentIsAvailable("lesson", req.body.lesson))) return res.status(404).json({ message: "Lesson not found" });
    material.set(req.body); await material.save();
    return res.status(200).json({ message: "Material updated successfully", data: material });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};
const deleteMaterial = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid material ID" });
  try {
    const material = await Material.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { returnDocument: "after" });
    if (!material) return res.status(404).json({ message: "Material not found" });
    return res.status(200).json({ message: "Material deleted successfully" });
  } catch (error) {
    next(error);
  }
};
const getLessonMaterials = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    if (!(await findVisibleLesson(req.params.id))) return res.status(404).json({ message: "Lesson not found" });
    const materials = await Material.find({ lesson: req.params.id, isPublished: true, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: materials.map((item) => ({ _id: item._id, title: item.title, description: item.description, kind: item.kind, url: materialUrl(item), format: item.file?.format, bytes: item.file?.bytes })) });
  } catch (error) { next(error); }
};
const uploadMaterialFile = (req, res, next) => {
  const publicId = `${crypto.randomBytes(20).toString("hex").slice(0, 20)}.pdf`;
  const stream = cloudinary.uploader.upload_stream({
    folder: "catalyst/materials",
    public_id: publicId,
    unique_filename: false,
    overwrite: false,
    resource_type: "raw",
    timeout: 30000
  }, (error, result) => {
    if (error) { const e = new Error("Material upload failed"); e.status = 502; return next(e); }
    return res.status(201).json({ data: { url: result.secure_url, publicId: result.public_id, format: "pdf", bytes: req.file.size } });
  });
  stream.end(req.file.buffer);
};
module.exports = { createMaterial, updateMaterial, deleteMaterial, getLessonMaterials, uploadMaterialFile };
