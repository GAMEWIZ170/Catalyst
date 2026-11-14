const Mastery = require("../models/mastery.models");

const LABELS = ["Not started", "Attempted", "Familiar", "Proficient", "Mastered"];
const todayKey = () => new Date().toISOString().slice(0, 10);

// Updates one student's mastery of one lesson after something happened. Events:
//   { type: "attempt" }          any activity on the lesson: Attempted
//   { type: "score", score }     a lesson test result: 70% or more is Familiar, 100% is Proficient.
//                                100% again on a later day than Proficient was reached is Mastered
//   { type: "review" }           a lesson question from the mistakes queue answered right, or a flashcard marked
//                                Confident. On a later day than Proficient was reached, this makes it Mastered
//   { type: "wrong" }            a wrong answer on a lesson question drops one level, at most once a day
// Levels only go up through the events above. A failed lesson test never lowers a level by itself.
const record = async (userId, lessonId, event) => {
  const today = todayKey();
  const found = await Mastery.findOne({ user: userId, lesson: lessonId });
  const row = found || new Mastery({ user: userId, lesson: lessonId, level: 1 });
  const before = found ? row.level : 0;
  let level = row.level;

  if (event.type === "score") {
    if (event.score >= 70) level = Math.max(level, 2);
    if (event.score >= 100) level = Math.max(level, 3);
    if (event.score >= 100 && before >= 3 && row.proficientDay && row.proficientDay < today) level = 4;
  } else if (event.type === "review") {
    if (before >= 3 && row.proficientDay && row.proficientDay < today) level = 4;
  } else if (event.type === "wrong") {
    if (found && row.lastDropDay !== today && level > 1) {
      level -= 1;
      row.lastDropDay = today;
    }
  }

  if (level >= 3 && before < 3) row.proficientDay = today;
  if (found && level === before && row.lastDropDay === found.lastDropDay && row.proficientDay === found.proficientDay) return before;
  row.level = level;
  await row.save();
  return level;
};

module.exports = { record, LABELS };
