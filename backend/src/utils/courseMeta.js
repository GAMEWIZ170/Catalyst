const Category = require("../models/category.models");
const Author = require("../models/author.models");

const GENERAL = { _id: null, name: "General", slug: "general" };

// Adds { category, authors } to course objects (plain, from .lean()). Two queries for any number of courses.
// A course with no category, or one whose category was removed, shows as General.
const attachMeta = async (courses) => {
  const list = Array.isArray(courses) ? courses : [courses];
  const categoryIds = [...new Set(list.map((course) => course.category).filter(Boolean).map(String))];
  const authorIds = [...new Set(list.flatMap((course) => course.authors || []).map(String))];
  const [categories, authors] = await Promise.all([
    categoryIds.length ? Category.find({ _id: { $in: categoryIds } }).select("name slug").lean() : [],
    authorIds.length ? Author.find({ _id: { $in: authorIds } }).select("displayName bio avatar").lean() : []
  ]);
  const categoryById = new Map(categories.map((row) => [String(row._id), row]));
  const authorById = new Map(authors.map((row) => [String(row._id), row]));
  const out = list.map((course) => ({
    ...course,
    category: categoryById.get(String(course.category)) || GENERAL,
    authors: (course.authors || []).map((id) => authorById.get(String(id))).filter(Boolean)
  }));
  return Array.isArray(courses) ? out : out[0];
};

module.exports = { attachMeta, GENERAL };
