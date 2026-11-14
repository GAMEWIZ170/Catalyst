const Event = require("../models/event.models");
const User = require("../models/user.models");
const Lesson = require("../models/lesson.models");
const DailyStat = require("../models/dailystat.models");
const StatSummary = require("../models/statsummary.models");
const { shiftDay } = require("./day");

// Everything on the admin dashboard is built here from the events collection. Days are UTC days (one clock for the
// whole platform). Admin accounts are left out. Safe to run any number of times: results replace the old ones.
const HISTORY_DAYS = 120;   // how far back events are read (enough for 30 day retention of recent weeks)
const ROW_DAYS = 60;        // days kept as daily_stats rows
const FEED_EVENTS = ["set_created", "set_studied", "challenge_sent", "challenge_played"];

const dayOf = (date) => date.toISOString().slice(0, 10);
const mondayOf = (key) => {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDay(key, -((weekday + 6) % 7));
};
const range = (from, to) => {
  const days = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) days.push(day);
  return days;
};

const compute = async (now = new Date()) => {
  const today = dayOf(now);
  const since = new Date(`${shiftDay(today, -HISTORY_DAYS)}T00:00:00Z`);
  const admins = (await User.find({ role: "admin" }).select("_id").lean()).map((row) => row._id);
  const match = { ts: { $gte: since }, user: { $nin: admins } };

  const [userDays, typeCounts, signupRows, firstTimes, openedRows, completedRows] = await Promise.all([
    Event.aggregate([{ $match: match }, { $group: { _id: { user: "$user", day: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } } } } }]),
    Event.aggregate([{ $match: match }, { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } }, type: "$type" }, n: { $sum: 1 } } }]),
    Event.aggregate([{ $match: { ...match, type: "signup" } }, { $group: { _id: "$user", ts: { $min: "$ts" } } }]),
    Event.aggregate([{ $match: { ...match, type: { $in: ["lesson_completed", "test_submitted"] } } }, { $group: { _id: { user: "$user", type: "$type" }, ts: { $min: "$ts" } } }]),
    Event.aggregate([{ $match: { ...match, type: "lesson_opened", ts: { $gte: new Date(`${shiftDay(today, -29)}T00:00:00Z`) } } }, { $group: { _id: { lesson: "$props.lesson", user: "$user" } } }]),
    Event.aggregate([{ $match: { ...match, type: "lesson_completed", ts: { $gte: new Date(`${shiftDay(today, -29)}T00:00:00Z`) } } }, { $group: { _id: { lesson: "$props.lesson", user: "$user" } } }])
  ]);

  const usersByDay = new Map();
  const daysByUser = new Map();
  for (const { _id } of userDays) {
    const id = String(_id.user);
    if (!usersByDay.has(_id.day)) usersByDay.set(_id.day, new Set());
    usersByDay.get(_id.day).add(id);
    if (!daysByUser.has(id)) daysByUser.set(id, new Set());
    daysByUser.get(id).add(_id.day);
  }
  const countsByDay = new Map();
  for (const { _id, n } of typeCounts) {
    if (!countsByDay.has(_id.day)) countsByDay.set(_id.day, {});
    countsByDay.get(_id.day)[_id.type] = n;
  }
  const activeIn = (from, to) => {
    const set = new Set();
    for (const day of range(from, to)) for (const id of usersByDay.get(day) || []) set.add(id);
    return set.size;
  };

  // --- one row per day
  const days = range(shiftDay(today, -(ROW_DAYS - 1)), today);
  const rows = days.map((day) => {
    const counts = countsByDay.get(day) || {};
    return {
      day,
      dau: (usersByDay.get(day) || new Set()).size,
      wau: activeIn(shiftDay(day, -6), day),
      mau: activeIn(shiftDay(day, -29), day),
      signups: counts.signup || 0,
      counts
    };
  });
  await DailyStat.bulkWrite(rows.map((row) => ({ updateOne: { filter: { day: row.day }, update: { $set: row }, upsert: true } })));

  // --- retention by signup week: the share of a week's new students who were active exactly 1, 7 and 30 days later.
  // A week only counts for D<n> students whose day n is already over.
  const lastFullDay = shiftDay(today, -1);
  const cohorts = new Map(); // week -> { users: n, d1: {ok, eligible}, ... }
  for (const row of signupRows) {
    const id = String(row._id);
    const signupDay = dayOf(row.ts);
    const week = mondayOf(signupDay);
    if (!cohorts.has(week)) cohorts.set(week, { week, users: 0, d1: { ok: 0, eligible: 0 }, d7: { ok: 0, eligible: 0 }, d30: { ok: 0, eligible: 0 } });
    const cohort = cohorts.get(week);
    cohort.users += 1;
    for (const [name, n] of [["d1", 1], ["d7", 7], ["d30", 30]]) {
      const target = shiftDay(signupDay, n);
      if (target > lastFullDay) continue;
      cohort[name].eligible += 1;
      if ((daysByUser.get(id) || new Set()).has(target)) cohort[name].ok += 1;
    }
  }
  const pct = (part) => (part.eligible ? Math.round((part.ok / part.eligible) * 100) : null);
  const retention = [...cohorts.values()].sort((a, b) => (a.week < b.week ? 1 : -1)).slice(0, 8)
    .map((cohort) => ({ week: cohort.week, users: cohort.users, d1: pct(cohort.d1), d7: pct(cohort.d7), d30: pct(cohort.d30) }));

  // --- activation: of students who signed up at least 48 hours ago (last 8 weeks), the share who completed a lesson
  // and submitted a test within 48 hours of signing up.
  const first = new Map();
  for (const { _id, ts } of firstTimes) first.set(`${_id.user}:${_id.type}`, ts);
  const cutoff = new Date(now.getTime() - 48 * 3600 * 1000);
  const window = new Date(`${shiftDay(today, -56)}T00:00:00Z`);
  let eligible = 0;
  let activated = 0;
  for (const row of signupRows) {
    if (row.ts > cutoff || row.ts < window) continue;
    eligible += 1;
    const limit = row.ts.getTime() + 48 * 3600 * 1000;
    const lesson = first.get(`${row._id}:lesson_completed`);
    const test = first.get(`${row._id}:test_submitted`);
    if (lesson && test && lesson.getTime() <= limit && test.getTime() <= limit) activated += 1;
  }

  // --- lessons (last 30 days, counting each student once per lesson)
  const opened = new Map();
  const completed = new Map();
  for (const { _id } of openedRows) if (_id.lesson) opened.set(_id.lesson, (opened.get(_id.lesson) || 0) + 1);
  for (const { _id } of completedRows) if (_id.lesson) completed.set(_id.lesson, (completed.get(_id.lesson) || 0) + 1);
  const topIds = [...completed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
  const dropRows = [...opened.entries()].filter(([, n]) => n >= 3)
    .map(([id, n]) => ({ id, opened: n, completed: completed.get(id) || 0 }))
    .map((row) => ({ ...row, left: Math.max(0, row.opened - row.completed), rate: Math.round((1 - Math.min(row.completed, row.opened) / row.opened) * 100) }))
    .filter((row) => row.left > 0)
    .sort((a, b) => b.rate - a.rate || b.left - a.left).slice(0, 10);
  const titleIds = [...new Set([...topIds, ...dropRows.map((row) => row.id)])];
  const lessonDocs = titleIds.length ? await Lesson.find({ _id: { $in: titleIds } }).select("title unit").populate({ path: "unit", select: "course", populate: { path: "course", select: "code" } }).lean() : [];
  const labels = new Map(lessonDocs.map((doc) => [String(doc._id), { title: doc.title, course: doc.unit?.course?.code || "" }]));
  const named = (id) => ({ lessonId: id, ...(labels.get(id) || { title: "Deleted lesson", course: "" }) });

  // --- totals for the last 7 and 30 days
  const sum = (from, type) => range(from, today).reduce((total, day) => total + ((countsByDay.get(day) || {})[type] || 0), 0);
  const totals = (length) => {
    const from = shiftDay(today, -(length - 1));
    return Object.fromEntries([["signups", sum(from, "signup")], ["lessonsCompleted", sum(from, "lesson_completed")], ["testsSubmitted", sum(from, "test_submitted")], ...FEED_EVENTS.map((type) => [type, sum(from, type)])]);
  };

  const data = {
    today,
    activation: { eligible, activated, percent: eligible ? Math.round((activated / eligible) * 100) : null },
    retention,
    topLessons: topIds.map((id) => ({ ...named(id), completed: completed.get(id), opened: opened.get(id) || 0 })),
    dropOff: dropRows.map((row) => ({ ...named(row.id), opened: row.opened, completed: row.completed, leftPercent: row.rate })),
    totals: { last7: totals(7), last30: totals(30) }
  };
  await StatSummary.updateOne({ key: "latest" }, { $set: { data, computedAt: now } }, { upsert: true });
  return { rows: rows.length, data };
};

module.exports = { compute };
