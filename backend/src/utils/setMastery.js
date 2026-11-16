const SetMastery = require("../modules/lab/setmastery.models");

// Mastery of one unit of a study set, driven by the unit's quiz (Khan Academy style). Levels only go up.
//   Not started  no quiz result yet, or a score under FAMILIAR
//   Familiar     a unit quiz score of FAMILIAR or more
//   Proficient   a unit quiz score of PROFICIENT or more
//   Mastered     PROFICIENT or more again on a later day than Proficient was reached (so it was remembered, not crammed)
// Days are UTC, like the streak.
const LABELS = ["Not started", "Familiar", "Proficient", "Mastered"];
const FAMILIAR = 50;
const PROFICIENT = 80;
const utcDay = () => new Date().toISOString().slice(0, 10);

// Called after a quiz attempt is recorded. Only a quiz that belongs to a unit of a study set counts.
const recordQuiz = async (userId, test, score) => {
  if (test.scope !== "set" || !test.setUnit) return null;
  const today = utcDay();
  const found = await SetMastery.findOne({ user: userId, unit: test.setUnit });
  const row = found || new SetMastery({ user: userId, set: test.set?._id || test.set, unit: test.setUnit });
  let level = row.level;
  if (score >= FAMILIAR) level = Math.max(level, 1);
  if (score >= PROFICIENT) level = row.level >= 2 && row.proficientDay && row.proficientDay < today ? 3 : Math.max(level, 2);
  if (level >= 2 && !row.proficientDay) row.proficientDay = today;
  row.level = level;
  row.bestScore = Math.max(row.bestScore, score);
  row.lastScore = score;
  row.attempts += 1;
  try {
    await row.save();
  } catch (error) {
    if (error.code !== 11000) throw error; // two submits at the same moment: the other one made the row
  }
  return level;
};

// The student finished a lesson (read it, studied its cards). Kept on the unit's row so the outline needs one read.
const markLessonDone = (userId, lesson) => SetMastery.updateOne(
  { user: userId, unit: lesson.unit },
  { $addToSet: { lessonsDone: lesson._id }, $setOnInsert: { set: lesson.set } },
  { upsert: true, setDefaultsOnInsert: true }
);

module.exports = { recordQuiz, markLessonDone, LABELS, FAMILIAR, PROFICIENT };
