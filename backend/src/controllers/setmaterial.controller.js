const mongoose = require("mongoose");
const crypto = require("crypto");
const { extractText, getDocumentProxy } = require("unpdf");
const SetMaterial = require("../models/setmaterial.models");
const cloudinary = require("../config/cloudinary");
const { findOwnSet } = require("../utils/ownSet");

const MAX_PER_SET = 20;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // uploaded files, per student
const MAX_TEXT_CHARS = 100000;            // stored text, per material

const notFound = (res, what = "Study set") => res.status(404).json({ message: `${what} not found` });
const publicMaterial = (row) => ({ id: row._id, kind: row.kind, title: row.title, bytes: row.bytes, pages: row.pages, characters: (row.text || "").length, createdAt: row.createdAt });
const usedBytes = async (userId) => (await SetMaterial.aggregate([{ $match: { owner: new mongoose.Types.ObjectId(String(userId)) } }, { $group: { _id: null, bytes: { $sum: "$bytes" } } }]))[0]?.bytes || 0;

const listMaterials = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const rows = await SetMaterial.find({ set: set._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ data: { items: rows.map(publicMaterial), usedBytes: await usedBytes(req.user.id), limitBytes: MAX_TOTAL_BYTES } });
  } catch (error) {
    next(error);
  }
};

const addText = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if ((await SetMaterial.countDocuments({ set: set._id })) >= MAX_PER_SET) return res.status(409).json({ message: `A set can hold up to ${MAX_PER_SET} materials` });
    const row = await SetMaterial.create({ set: set._id, owner: req.user.id, kind: "text", title: req.body.title, text: req.body.text });
    return res.status(201).json({ message: "Material added", data: publicMaterial(row) });
  } catch (error) {
    next(error);
  }
};

const uploadPrivate = (buffer, publicId) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({
    folder: "catalyst/private/study-sets", public_id: publicId, unique_filename: false, overwrite: false,
    resource_type: "raw", type: "private", timeout: 30000
  }, (error, result) => (error ? reject(error) : resolve(result)));
  stream.end(buffer);
});

// A PDF: its type and %PDF- bytes were checked by uploadMaterial before this runs. The text is read first, so a PDF with
// no readable text (a scan) is refused without storing anything. The file then goes to a private folder.
const addPdf = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if ((await SetMaterial.countDocuments({ set: set._id })) >= MAX_PER_SET) return res.status(409).json({ message: `A set can hold up to ${MAX_PER_SET} materials` });
    if ((await usedBytes(req.user.id)) + req.file.size > MAX_TOTAL_BYTES) return res.status(409).json({ message: "You have used your upload space. Delete some material first." });
    let text = "";
    let pages = 0;
    try {
      const pdf = await getDocumentProxy(new Uint8Array(req.file.buffer));
      const out = await extractText(pdf, { mergePages: true });
      text = String(out.text || "").replace(/\s+\n/g, "\n").trim().slice(0, MAX_TEXT_CHARS);
      pages = out.totalPages || 0;
    } catch {
      return res.status(400).json({ message: "This PDF could not be read" });
    }
    if (text.length < 20) return res.status(400).json({ message: "No text was found in this PDF. It may be a scan or a photo. Paste the text instead." });
    const publicId = `${req.user.id}-${crypto.randomBytes(12).toString("hex")}.pdf`;
    let uploaded;
    try {
      uploaded = await uploadPrivate(req.file.buffer, publicId);
    } catch {
      const failure = new Error("Material upload failed");
      failure.status = 502;
      return next(failure);
    }
    const title = (typeof req.body.title === "string" && req.body.title.trim()) || (req.file.originalname || "PDF").replace(/\.pdf$/i, "");
    const row = await SetMaterial.create({ set: set._id, owner: req.user.id, kind: "pdf", title: title.slice(0, 120), text, bytes: req.file.size, pages, publicId: uploaded.public_id });
    return res.status(201).json({ message: "Material added", data: publicMaterial(row) });
  } catch (error) {
    next(error);
  }
};

const removeMaterial = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.materialId)) return notFound(res, "Material");
    const row = await SetMaterial.findOne({ _id: req.params.materialId, owner: req.user.id });
    if (!row) return notFound(res, "Material");
    if (row.publicId) await cloudinary.uploader.destroy(row.publicId, { resource_type: "raw", type: "private" }).catch((error) => console.error("Private file delete failed:", error.message));
    await row.deleteOne();
    return res.status(200).json({ message: "Material deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { listMaterials, addText, addPdf, removeMaterial };
