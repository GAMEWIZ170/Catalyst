const { dayKey, shiftDay } = require("./day");

// days: a list of "YYYY-MM-DD" strings, possibly with repeats. timeZone decides which day "today" is.
const calculateStreak = (days, timeZone) => {
  const active = new Set(days);
  const today = dayKey(timeZone);

  // If the student hasn't studied yet today, start counting from yesterday,
  // so the streak doesn't drop to 0 before the day is over
  let cursor = active.has(today) ? today : shiftDay(today, -1);

  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
};

module.exports = calculateStreak;
