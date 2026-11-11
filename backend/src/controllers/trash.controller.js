// trash.controller.js: list soft-deleted content and put it back.
// Deleting only sets deletedAt, so nothing is lost until an admin chooses otherwise.
const mongoose = require("mongoose");
const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");

const clip = (text, length = 80) => String(text || "").replace(/\s+/g, " ").trim().slice(0, length);

// How each kind of content is named, and which kind of content it belongs to.
const TYPES = {
  course: { Model: Course, label: (doc) => `${doc.code} ${doc.title}`, parent: null },
  unit: { Model: Unit, label: (doc) => doc.title, parent: () => ({ type: "course", id: (doc) => doc.course }) },
  lesson: { Model: Lesson, label: (doc) => doc.title, parent: () => ({ type: "unit", id: (doc) => doc.unit }) },
  test: { Model: Test, label: (doc) => doc.title, parent: () => ({ type: null, id: null }) },
  question: { Model: Question, label: (doc) => clip(doc.text), parent: () => ({ type: "test", id: (doc) => doc.test }) },
  flashcard: { Model: Flashcard, label: (doc) => clip(doc.front && doc.front.text) || "Flashcard", parent: () => ({ type: "lesson", id: (doc) => doc.lesson }) },
  material: { Model: Material, label: (doc) => doc.title, parent: () => ({ type: "lesson", id: (doc) => doc.lesson }) }
};

// The field that groups an item with the others in the same list, used to place a restored item last.
const SIBLING_FIELD = { unit: "course", lesson: "unit", question: "test", flashcard: "lesson", material: "lesson" };

// A test belongs to a lesson, a unit or a course depending on its scope.
const parentOf = (type, doc) => {
  if (type === "course") return null;
  if (type === "test") return { type: doc.scope, id: doc[doc.scope] };
  const rule = TYPES[type].parent();
  return { type: rule.type, id: rule.id(doc) };
};

// Walk up the parents. Returns the first one that is missing or deleted, or null when all are in place.
const firstMissingParent = async (type, doc) => {
  let current = parentOf(type, doc);
  while (current && current.id) {
    const parent = await TYPES[current.type].Model.findById(current.id).lean();
    if (!parent || parent.deletedAt) {
      return { type: current.type, label: parent ? TYPES[current.type].label(parent) : "(removed)" };
    }
    current = parentOf(current.type, parent);
  }
  return null;
};

const listTrash = async (req, res, next) => {
  try {
    const found = await Promise.all(Object.entries(TYPES).map(async ([type, { Model, label }]) => {
      const docs = await Model.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).limit(100).lean();
      return docs.map((doc) => ({ type, doc, title: label(doc) }));
    }));
    const items = found.flat().sort((a, b) => b.doc.deletedAt - a.doc.deletedAt).slice(0, 200);

    // Names and state of each item's direct parent, fetched once per kind.
    const wanted = {};
    for (const item of items) {
      const parent = parentOf(item.type, item.doc);
      if (parent && parent.id) (wanted[parent.type] ||= new Set()).add(String(parent.id));
    }
    const parents = {};
    await Promise.all(Object.entries(wanted).map(async ([type, ids]) => {
      const docs = await TYPES[type].Model.find({ _id: { $in: [...ids] } }).lean();
      parents[type] = new Map(docs.map((doc) => [String(doc._id), doc]));
    }));

    return res.status(200).json({
      data: items.map(({ type, doc, title }) => {
        const link = parentOf(type, doc);
        const parent = link && link.id ? parents[link.type]?.get(String(link.id)) : null;
        return {
          type,
          id: doc._id,
          title,
          deletedAt: doc.deletedAt,
          parentType: link ? link.type : null,
          parentTitle: parent ? TYPES[link.type].label(parent) : null,
          // True when the parent is still deleted, so the parent must be restored first.
          blocked: Boolean(link && link.id && (!parent || parent.deletedAt))
        };
      })
    });
  } catch (error) {
    next(error);
  }
};

const restore = async (req, res, next) => {
  const { type, id } = req.params;
  if (!TYPES[type]) return res.status(400).json({ message: "Unknown content type" });
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const { Model, label } = TYPES[type];
    const doc = await Model.findOne({ _id: id, deletedAt: { $ne: null } });
    if (!doc) return res.status(404).json({ message: "Nothing to restore" });

    const missing = await firstMissingParent(type, doc);
    if (missing) {
      return res.status(409).json({ message: `Restore the ${missing.type} "${missing.label}" first` });
    }

    // Put it at the end of its list, and unpublished, so nothing reappears for students until an admin chooses.
    if (Model.schema.path("order")) {
      const siblings = { deletedAt: null, _id: { $ne: doc._id } };
      if (type === "test") {
        siblings.scope = doc.scope;
        siblings[doc.scope] = doc[doc.scope];
      } else {
        const field = SIBLING_FIELD[type];
        siblings[field] = doc[field];
      }
      const last = await Model.findOne(siblings).sort({ order: -1 }).select("order").lean();
      doc.order = (last && last.order ? last.order : 0) + 1;
    }
    if (Model.schema.path("isPublished")) doc.isPublished = false;
    doc.deletedAt = null;
    await doc.save();

    return res.status(200).json({ message: "Restored. It is unpublished until you publish it.", data: { type, id: doc._id, title: label(doc) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listTrash, restore };
