const AiUsage = require("../modules/lab/aiusage.models");

// Fair use while the AI is a free beta with low limits (Phase X6.4).
//   per student, per UTC day: AI_DAILY_MESSAGES (default 20) companion messages and AI_DAILY_GENERATIONS (default 9) drafts
//   whole platform, per UTC day: AI_GLOBAL_DAILY (default 300) requests, and a "resting" flag the moment the provider
//   says its free allowance is used up. Both end with "AI is resting until tomorrow".
// Days are UTC so one clock covers everyone, and "tomorrow" is the same for all.
const int = (value, fallback) => (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback);
const limits = () => ({
  messages: int(process.env.AI_DAILY_MESSAGES, 20),
  generations: int(process.env.AI_DAILY_GENERATIONS, 9),
  global: int(process.env.AI_GLOBAL_DAILY, 300)
});

const FIELD = { message: "messages", generation: "generations" };
const today = () => new Date().toISOString().slice(0, 10);

// Counts one request against the student's day and the platform's day, unless a limit is reached.
// Returns { ok: true } or { ok: false, reason: "resting" | "daily" }. A request that then fails must call release().
const reserve = async (userId, kind) => {
  const field = FIELD[kind];
  const day = today();
  const max = limits();
  const platform = await AiUsage.findOne({ day, user: null }).lean();
  if (platform && (platform.resting || platform.messages + platform.generations >= max.global)) return { ok: false, reason: "resting" };
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

const addTokens = async (userId, usage = {}) => {
  const day = today();
  const inc = { inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0 };
  await Promise.all([AiUsage.updateOne({ day, user: userId }, { $inc: inc }, { upsert: true }), AiUsage.updateOne({ day, user: null }, { $inc: inc }, { upsert: true })]);
};

// The provider said its free allowance is gone: everyone rests until tomorrow (UTC).
const markResting = () => AiUsage.updateOne({ day: today(), user: null }, { $set: { resting: true } }, { upsert: true });

// What the student may still do today, for the screens.
const status = async (userId) => {
  const day = today();
  const max = limits();
  const [mine, platform] = await Promise.all([AiUsage.findOne({ day, user: userId }).lean(), AiUsage.findOne({ day, user: null }).lean()]);
  const resting = Boolean(platform && (platform.resting || platform.messages + platform.generations >= max.global));
  return {
    resting,
    messagesLeft: Math.max(0, max.messages - (mine?.messages || 0)),
    generationsLeft: Math.max(0, max.generations - (mine?.generations || 0)),
    limits: { messages: max.messages, generations: max.generations }
  };
};

module.exports = { reserve, release, addTokens, markResting, status, limits, today };
