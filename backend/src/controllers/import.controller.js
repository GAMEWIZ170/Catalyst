const mongoose = require("mongoose");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const { questionCreateSchema } = require("../middlewares/validate");
const { questionData, setCorrectFromIndexes } = require("./question.controller");
const { parseCsv, template, rowToBody, readRows } = require("../utils/csvImport");

// ADMIN: the template, with one example row for every question type.
const downloadTemplate = (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="catalyst-question-template.csv"');
  return res.status(200).send(template());
};

// Checks every row the same way the question form does: the CSV reader, then the form's Joi rules, then the model.
// Returns the good questions as unsaved documents plus one error per bad row.
const checkRows = async (csv, testId, firstOrder) => {
  const rows = readRows(parseCsv(csv));
  const errors = [];
  const questions = [];
  const summary = [];
  for (const { line, row } of rows) {
    summary.push({ line, type: (row.type || "").trim().toLowerCase(), text: (row.text || "").trim().slice(0, 120) });
    try {
      const body = rowToBody(row);
      const order = firstOrder + questions.length;
      const { error, value } = questionCreateSchema.validate({ ...body, test: String(testId), order }, { stripUnknown: true });
      if (error) throw new Error(error.details[0].message);
      const prepared = questionData(value);
      const question = new Question(prepared.data);
      const problem = setCorrectFromIndexes(question, prepared);
      if (problem) throw new Error(problem);
      await question.validate();
      questions.push(question);
    } catch (error) {
      const message = error.name === "ValidationError" ? Object.values(error.errors)[0].message : error.message;
      errors.push({ line, message });
    }
  }
  return { total: rows.length, errors, questions, summary };
};

// ADMIN: POST /admin/tests/:id/import?dryRun=0|1 with the CSV as the request body (Content-Type: text/csv).
// A dry run (the default) saves nothing. A real import saves all rows or none: one bad row stops it.
const importQuestions = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await Test.findOne({ _id: req.params.id, deletedAt: null }).select("_id").lean();
    if (!test) return res.status(404).json({ message: "Test not found" });
    if (typeof req.body !== "string" || !req.body.trim()) return res.status(400).json({ message: "Send the CSV file as text/csv" });
    const dryRun = req.query.dryRun !== "0";
    const last = await Question.findOne({ test: test._id, deletedAt: null }).sort({ order: -1 }).select("order").lean();
    let checked;
    try {
      checked = await checkRows(req.body, test._id, (last ? last.order : 0) + 1);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const { total, errors, questions, summary } = checked;
    const data = { total, valid: questions.length, errors, rows: summary, dryRun };
    if (dryRun) return res.status(200).json({ message: errors.length ? "Fix the rows below, then check again" : "Everything looks good", data });
    if (errors.length) return res.status(409).json({ message: "Nothing was imported. Fix the rows below first.", data: { ...data, imported: 0 } });
    await Question.insertMany(questions);
    return res.status(201).json({ message: `Imported ${questions.length} questions`, data: { ...data, imported: questions.length } });
  } catch (error) {
    next(error);
  }
};

module.exports = { downloadTemplate, importQuestions };
