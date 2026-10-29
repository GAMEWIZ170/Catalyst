// src/utils/streak.js
const DAY = 24 * 60 * 60 * 1000;
const toKey = (date) => date.toISOString().slice(0, 10); // "2026-10-29"

// days: a list of "YYYY-MM-DD" strings, possibly with repeats
const calculateStreak = (days) => {
  const active = new Set(days);
  const now = new Date();

  // If the student hasn't studied yet today, start counting from yesterday,
  // so the streak doesn't drop to 0 before the day is over
  let cursor = active.has(toKey(now)) ? now : new Date(now.getTime() - DAY);

  let streak = 0;
  while (active.has(toKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return streak;
};

module.exports = calculateStreak;