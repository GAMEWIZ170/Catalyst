const { dayKey, shiftDay } = require("./day");

// days: a list of "YYYY-MM-DD" strings, possibly with repeats. timeZone decides which day "today" is.
// One rest day never breaks a streak: a single day with no activity between two active days is skipped (it adds
// nothing to the count). Two missed days in a row end the streak.
const calculateStreak = (days, timeZone) => {
  const active = new Set(days);
  const today = dayKey(timeZone);

  // If the student hasn't studied yet today, start counting from yesterday,
  // so the streak doesn't drop to 0 before the day is over
  let cursor = active.has(today) ? today : shiftDay(today, -1);

  let streak = 0;
  for (;;) {
    if (active.has(cursor)) {
      streak++;
      cursor = shiftDay(cursor, -1);
    } else if (active.has(shiftDay(cursor, -1))) {
      cursor = shiftDay(cursor, -1); // a lone rest day: skip it
    } else {
      break;
    }
  }
  return streak;
};

// The longest streak ever, by the same rule: active days count, one missed day between two active days is forgiven,
// two missed days in a row start a new run.
const longestStreak = (days) => {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    run = previous && day <= shiftDay(previous, 2) ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
};

module.exports = calculateStreak;
module.exports.longestStreak = longestStreak;
