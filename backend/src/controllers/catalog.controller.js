const mongoose = require("mongoose");
const Category = require("../models/category.models");
const Author = require("../models/author.models");
const Course = require("../models/course.models");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const slugify = (name) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "category";

// STUDENT: categories that have a published course, for the course list filter.
// ADMIN (/admin/categories): every category, for the builder.
const listCategories = async (req, res, next) => {
  try {
    const all = await Category.find().select("name slug order").sort({ order: 1, name: 1 }).lean();
    if (req.baseUrl.endsWith("/admin") && req.user.role === "admin") return res.status(200).json({ data: all });
    const used = await Course.distinct("category", { isPublished: true, deletedAt: null });
    const usedIds = new Set(used.filter(Boolean).map(String));
    const hasGeneral = await Course.exists({ isPublished: true, deletedAt: null, $or: [{ category: null }, { category: { $nin: all.map((row) => row._id) } }] });
    const data = all.filter((row) => usedIds.has(String(row._id)));
    if (hasGeneral) data.unshift({ _id: null, name: "General", slug: "general" });
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const slug = slugify(req.body.name);
    if (slug === "general" || (await Category.exists({ slug }))) return res.status(409).json({ message: "A category with this name already exists" });
    const count = await Category.countDocuments();
    const category = await Category.create({ name: req.body.name, slug, order: req.body.order ?? count + 1 });
    return res.status(201).json({ message: "Category created", data: category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A category with this name already exists" });
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid category ID" });
  try {
    const set = {};
    if (req.body.name !== undefined) {
      const slug = slugify(req.body.name);
      if (slug === "general" || (await Category.exists({ slug, _id: { $ne: req.params.id } }))) return res.status(409).json({ message: "A category with this name already exists" });
      set.name = req.body.name;
      set.slug = slug;
    }
    if (req.body.order !== undefined) set.order = req.body.order;
    const category = await Category.findByIdAndUpdate(req.params.id, { $set: set }, { returnDocument: "after", runValidators: true });
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.status(200).json({ message: "Category updated", data: category });
  } catch (error) {
    next(error);
  }
};

// Courses in a deleted category fall back to General.
const deleteCategory = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid category ID" });
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    await Course.updateMany({ category: category._id }, { $set: { category: null } });
    return res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

const listAuthors = async (req, res, next) => {
  try {
    const data = await Author.find().select("displayName bio avatar").sort({ displayName: 1 }).lean();
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

const createAuthor = async (req, res, next) => {
  try {
    const author = await Author.create(req.body);
    return res.status(201).json({ message: "Author created", data: author });
  } catch (error) {
    next(error);
  }
};

const updateAuthor = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid author ID" });
  try {
    const author = await Author.findByIdAndUpdate(req.params.id, { $set: req.body }, { returnDocument: "after", runValidators: true });
    if (!author) return res.status(404).json({ message: "Author not found" });
    return res.status(200).json({ message: "Author updated", data: author });
  } catch (error) {
    next(error);
  }
};

// A deleted author is taken off every course.
const deleteAuthor = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid author ID" });
  try {
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) return res.status(404).json({ message: "Author not found" });
    await Course.updateMany({ authors: author._id }, { $pull: { authors: author._id } });
    return res.status(200).json({ message: "Author deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, listAuthors, createAuthor, updateAuthor, deleteAuthor };
