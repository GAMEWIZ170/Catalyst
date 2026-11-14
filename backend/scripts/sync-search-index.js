// One-time step for the search feature: MongoDB allows only one text index per collection, so the old
// title-only index ("title_text") must be dropped before the new title-and-text index can be built.
// Safe to run again. Run it against each database: npm run sync:search-index
require("dotenv").config();
const mongoose = require("mongoose");
const Lesson = require("../src/models/lesson.models");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await Lesson.collection.indexes();
  if (existing.some((index) => index.name === "title_text")) {
    await Lesson.collection.dropIndex("title_text");
    console.log("Dropped the old title_text index");
  }
  await Lesson.createIndexes();
  console.log("Search index ready: lesson_search");
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
