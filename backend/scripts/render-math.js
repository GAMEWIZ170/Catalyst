// Draws the formulas of lessons saved before pre-rendering existed (and refreshes older ones after a KaTeX upgrade).
// By default it handles only lessons that have no stored formulas yet. Add --all to redo every lesson.
// Safe to run again. Run it against each database: npm run render:math  (or: npm run render:math -- --all)
require("dotenv").config();
const mongoose = require("mongoose");
const Lesson = require("../src/modules/courses/lesson.models");
const { prerenderMath } = require("../src/utils/math");

(async () => {
  const all = process.argv.includes("--all");
  await mongoose.connect(process.env.MONGODB_URI);
  const filter = { deletedAt: null, ...(all ? {} : { explanationMath: { $exists: false } }) };
  const lessons = await Lesson.find(filter).select("explanation").lean();
  let formulas = 0;
  for (const lesson of lessons) {
    const entries = prerenderMath(lesson.explanation);
    formulas += entries.length;
    await Lesson.updateOne({ _id: lesson._id }, { $set: { explanationMath: entries } });
  }
  console.log(`Pre-rendered ${formulas} formulas in ${lessons.length} lessons${all ? " (all lessons)" : ""}`);
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
