const mongoose = require("mongoose");
const crypto = require("crypto");
const { extractText, getDocumentProxy } = require("unpdf");
const SetMaterial = require("./setmaterial.models");
const cloudinary = require("../../config/cloudinary");
const { findOwnSet } = require("../../utils/ownSet");

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

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Stores pasted text as material. Throws an error with a status when the set is full.
const storeTextMaterial = async (set, userId, title, text) => {
  if ((await SetMaterial.countDocuments({ set: set._id })) >= MAX_PER_SET) throw httpError(409, `A set can hold up to ${MAX_PER_SET} materials`);
  return SetMaterial.create({ set: set._id, owner: userId, kind: "text", title, text });
};

const addText = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const row = await storeTextMaterial(set, req.user.id, req.body.title, req.body.text);
    return res.status(201).json({ message: "Material added", data: publicMaterial(row) });
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 502) return res.status(error.status).json({ message: error.message });
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
// allowScan (the build flow, when the AI model can read files): a PDF with no text is kept, and the model reads the file itself.
// Throws an error with a status (400, 409 or 502) the caller turns into a reply.
const storePdfMaterial = async (set, userId, file, title, { allowScan = false } = {}) => {
  if ((await SetMaterial.countDocuments({ set: set._id })) >= MAX_PER_SET) throw httpError(409, `A set can hold up to ${MAX_PER_SET} materials`);
  if ((await usedBytes(userId)) + file.size > MAX_TOTAL_BYTES) throw httpError(409, "You have used your upload space. Delete some material first.");
  let text = "";
  let pages = 0;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
    const out = await extractText(pdf, { mergePages: true });
    text = String(out.text || "").replace(/\s+\n/g, "\n").trim().slice(0, MAX_TEXT_CHARS);
    pages = out.totalPages || 0;
  } catch {
    throw httpError(400, "This PDF could not be read");
  }
  if (text.length < 20 && !allowScan) throw httpError(400, "No text was found in this PDF. It may be a scan or a photo. Paste the text instead.");
  const publicId = `${userId}-${crypto.randomBytes(12).toString("hex")}.pdf`;
  let uploaded;
  try {
    uploaded = await uploadPrivate(file.buffer, publicId);
  } catch {
    throw httpError(502, "Material upload failed");
  }
  const name = (typeof title === "string" && title.trim()) || (file.originalname || "PDF").replace(/\.pdf$/i, "");
  return SetMaterial.create({ set: set._id, owner: userId, kind: "pdf", title: name.slice(0, 120), text, bytes: file.size, pages, publicId: uploaded.public_id });
};

const addPdf = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const row = await storePdfMaterial(set, req.user.id, req.file, req.body.title);
    return res.status(201).json({ message: "Material added", data: publicMaterial(row) });
  } catch (error) {
    if (error.status === 502) return next(error);
    if (error.status) return res.status(error.status).json({ message: error.message });
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

module.exports = { listMaterials, addText, addPdf, removeMaterial, storeTextMaterial, storePdfMaterial };
