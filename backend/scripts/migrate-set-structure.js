// One-time migration for the study companion: a flat study set becomes a mini course.
//   Before: a set has one notes page (SetNote) and a flat list of flashcards.
//   After:  the set has one unit with one lesson. The lesson holds a copy of the notes, and the set's flashcards sit in it.
// Quizzes are not touched: they stay tests of the whole set. The old notes page is kept, so nothing is lost.
// Run: npm run migrate:set-structure              (dry run: only says what it would do)
//      npm run migrate:set-structure -- --apply   (makes the changes)
// Safe to run twice: a set that already has a unit is skipped. Reads .env at runtime. Never prints the database address.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const StudySet = require("../src/modules/lab/studyset.models");
const SetNote = require("../src/modules/lab/setnote.models");
const SetUnit = require("../src/modules/lab/setunit.models");
const SetLesson = require("../src/modules/lab/setlesson.models");
const Flashcard = require("../src/modules/flashcards/flashcard.models");

const APPLY = process.argv.includes("--apply");

const run = async () => {
  if (!process.env.MONGODB_URI) { console.error("MONGODB_URI is not set in .env"); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI);
  let changed = 0;
  let skipped = 0;
  let cards = 0;
  for (const set of await StudySet.find({ deletedAt: null }).select("title").lean()) {
    if (await SetUnit.exists({ set: set._id })) { skipped++; continue; }
    const note = await SetNote.findOne({ set: set._id }).lean();
    const loose = await Flashcard.countDocuments({ set: set._id, setLesson: null, deletedAt: null });
    changed++;
    cards += loose;
    if (!APPLY) continue;
    const unit = await SetUnit.create({ set: set._id, title: set.title, order: 1 });
    const lesson = await SetLesson.create({ set: set._id, unit: unit._id, title: set.title, order: 1, content: note?.content || null });
    // timestamps: false keeps each card's "last changed" date as it was.
    await Flashcard.updateMany({ set: set._id, setLesson: null }, { $set: { setLesson: lesson._id } }, { timestamps: false });
  }
  console.log(`${APPLY ? "Sets converted" : "Sets that would be converted"}: ${changed} (${cards} flashcards moved into a lesson), already fine: ${skipped}`);
  if (!APPLY) console.log("Nothing was changed. Run again with --apply to make the changes.");
  await mongoose.disconnect();
};

run().catch((error) => { console.error(error.message); process.exit(1); });
