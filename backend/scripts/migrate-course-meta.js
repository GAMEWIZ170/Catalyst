// One-time migration: a course's category and authors become plain properties of the course.
//   Before: course.category is a Category id and course.authors is a list of Author ids (two collections).
//   After:  course.category is the category name (text) and course.authors is [{ displayName, bio }].
// Run: npm run migrate:course-meta            (converts the courses, keeps the old collections)
//      npm run migrate:course-meta -- --drop  (converts, then drops the old "categories" and "authors" collections)
// Safe to run twice: courses that are already converted are skipped. Reads .env at runtime. Never prints the database address.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const DROP = process.argv.includes("--drop");
const isId = (value) => value && typeof value === "object" && (value._bsontype === "ObjectId" || value._bsontype === "ObjectID");

const run = async () => {
  if (!process.env.MONGODB_URI) { console.error("MONGODB_URI is not set in .env"); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const has = async (name) => (await db.listCollections({ name }).toArray()).length > 0;
  const categories = (await has("categories")) ? await db.collection("categories").find().toArray() : [];
  const authors = (await has("authors")) ? await db.collection("authors").find().toArray() : [];
  const categoryName = new Map(categories.map((row) => [String(row._id), row.name]));
  const author = new Map(authors.map((row) => [String(row._id), { displayName: row.displayName, bio: row.bio || "" }]));

  let changed = 0;
  let skipped = 0;
  for (const course of await db.collection("courses").find().toArray()) {
    const oldCategory = course.category;
    const oldAuthors = Array.isArray(course.authors) ? course.authors : [];
    const needsCategory = isId(oldCategory) || (typeof oldCategory === "string" && /^[a-f0-9]{24}$/i.test(oldCategory));
    const needsAuthors = oldAuthors.some((item) => isId(item) || typeof item === "string");
    if (!needsCategory && !needsAuthors && (typeof oldCategory === "string" || oldCategory === undefined)) { skipped++; continue; }
    const set = {};
    if (needsCategory) set.category = categoryName.get(String(oldCategory)) || "";
    else if (oldCategory === null) set.category = "";
    if (needsAuthors) set.authors = oldAuthors.map((item) => (isId(item) || typeof item === "string" ? author.get(String(item)) : item)).filter(Boolean);
    if (Object.keys(set).length) { await db.collection("courses").updateOne({ _id: course._id }, { $set: set }); changed++; }
    else skipped++;
  }
  console.log(`Courses converted: ${changed}, already fine: ${skipped}`);
  if (DROP) {
    for (const name of ["categories", "authors"]) if (await has(name)) { await db.collection(name).drop(); console.log(`Dropped collection: ${name}`); }
  } else {
    console.log("The old categories and authors collections were kept. Run again with --drop when you are happy.");
  }
  await mongoose.disconnect();
};

run().catch((error) => { console.error(error.message); process.exit(1); });
