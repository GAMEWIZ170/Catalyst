const AiUsage = require("../modules/lab/aiusage.models");
const { defaultModel, findModel } = require("../config/ai");

// Fair use while the AI is a free beta with low limits (Phase X6.4, widened for the study companion).
//   per student, per UTC day: AI_DAILY_BUILDS (default 3) whole-set builds, AI_DAILY_MESSAGES (default 30) companion
//   messages, AI_DAILY_GENERATIONS (default 9) single drafts and AI_DAILY_MARKS (default 60) short answers marked
//   whole platform, per UTC day: AI_GLOBAL_DAILY (default 1000) calls to the provider, and a "resting" flag the moment
//   the provider says its free daily allowance is used up. Both end with "AI is resting until tomorrow".
// One build is ONE of the student's builds but several provider calls (one for the outline, one per lesson), so the
// platform cap counts real calls (`requests`), not builds.
// Days are UTC so one clock covers everyone, and "tomorrow" is the same for all.
const int = (value, fallback) => (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback);
const limits = () => ({
  messages: int(process.env.AI_DAILY_MESSAGES, 30),
  generations: int(process.env.AI_DAILY_GENERATIONS, 9),
  builds: int(process.env.AI_DAILY_BUILDS, 3),
  marks: int(process.env.AI_DAILY_MARKS, 60),
  global: int(process.env.AI_GLOBAL_DAILY, 1000)
});

const FIELD = { message: "messages", generation: "generations", build: "builds", mark: "marks" };
const today = () => new Date().toISOString().slice(0, 10);

// Calls made today. Rows written before `requests` existed only have the two older counters.
const platformUsed = (row) => Math.max(row.requests || 0, (row.messages || 0) + (row.generations || 0) + (row.marks || 0));
const isResting = (row, max) => Boolean(row && (row.resting || platformUsed(row) >= max.global));

// Counts one request against the student's day and the platform's day, unless a limit is reached.
// Returns { ok: true } or { ok: false, reason: "resting" | "daily" }. A request that then fails must call release().
const reserve = async (userId, kind) => {
  const field = FIELD[kind];
  const day = today();
  const max = limits();
  const platform = await AiUsage.findOne({ day, user: null }).lean();
  if (isResting(platform, max)) return { ok: false, reason: "resting" };
  try {
    const row = await AiUsage.findOneAndUpdate(
      { day, user: userId, [field]: { $lt: max[field] } },
      { $inc: { [field]: 1 } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await AiUsage.updateOne({ day, user: null }, { $inc: { [field]: 1 } }, { upsert: true });
    return { ok: true, used: row[field] };
  } catch (error) {
    if (error.code === 11000) return { ok: false, reason: "daily" }; // the row exists and is already at its limit
    throw error;
  }
};

// Gives the request back when the AI failed, so a failure does not use up the student's day.
const release = async (userId, kind) => {
  const field = FIELD[kind];
  const day = today();
  await Promise.all([
    AiUsage.updateOne({ day, user: userId, [field]: { $gt: 0 } }, { $inc: { [field]: -1 } }),
    AiUsage.updateOne({ day, user: null, [field]: { $gt: 0 } }, { $inc: { [field]: -1 } })
  ]);
};

// Called after every real provider call: adds its tokens and counts it as one request (`calls` when one step made more).
const addTokens = async (userId, usage = {}, calls = 1) => {
  const day = today();
  const inc = { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, requests: calls };
  await Promise.all([AiUsage.updateOne({ day, user: userId }, { $inc: inc }, { upsert: true }), AiUsage.updateOne({ day, user: null }, { $inc: inc }, { upsert: true })]);
};

// The provider said its free allowance is gone: everyone rests until tomorrow (UTC).
const markResting = () => AiUsage.updateOne({ day: today(), user: null }, { $set: { resting: true } }, { upsert: true });

// True when the platform may not call the provider any more today. A long build asks this between its steps.
const platformResting = async () => isResting(await AiUsage.findOne({ day: today(), user: null }).lean(), limits());

// What the student may still do today, for the screens.
const status = async (userId) => {
  const day = today();
  const max = limits();
  const [mine, platform] = await Promise.all([AiUsage.findOne({ day, user: userId }).lean(), AiUsage.findOne({ day, user: null }).lean()]);
  return {
    resting: isResting(platform, max),
    messagesLeft: Math.max(0, max.messages - (mine?.messages || 0)),
    generationsLeft: Math.max(0, max.generations - (mine?.generations || 0)),
    buildsLeft: Math.max(0, max.builds - (mine?.builds || 0)),
    marksLeft: Math.max(0, max.marks - (mine?.marks || 0)),
    limits: { messages: max.messages, generations: max.generations, builds: max.builds, marks: max.marks }
  };
};

// What these tokens would cost on the paid tier of a model (US dollars). The free tier costs nothing.
const costOf = (inputTokens, outputTokens, modelId) => {
  const model = (modelId && findModel(modelId)) || defaultModel();
  return ((inputTokens || 0) * (model.inputPrice || 0) + (outputTokens || 0) * (model.outputPrice || 0)) / 1e6;
};

module.exports = { reserve, release, addTokens, markResting, platformResting, status, limits, today, costOf };
