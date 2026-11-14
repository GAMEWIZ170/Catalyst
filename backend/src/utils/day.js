// A "day" is the student's own calendar day, so a streak does not break at 1 a.m. for someone far from UTC.
// Day keys are strings like "2026-11-14". A missing or unknown time zone falls back to UTC.
const formatters = new Map();

const isValidTimeZone = (zone) => {
  if (typeof zone !== "string" || !zone || zone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

const formatterFor = (zone) => {
  const key = isValidTimeZone(zone) ? zone : "UTC";
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat("en-CA", { timeZone: key, year: "numeric", month: "2-digit", day: "2-digit" }));
  return formatters.get(key);
};

// en-CA prints YYYY-MM-DD.
const dayKey = (zone, date = new Date()) => formatterFor(zone).format(date);

// The key for the day before or after a key. Works on the text, so daylight saving cannot skip or repeat a day.
const shiftDay = (key, days) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// The Monday of the week a day key falls in. Weeks run Monday to Sunday.
const weekStart = (key) => {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDay(key, -((weekday + 6) % 7));
};

module.exports = { dayKey, shiftDay, weekStart, isValidTimeZone };
