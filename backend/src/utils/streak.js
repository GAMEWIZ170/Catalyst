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

module.exports = calculateStreak;
