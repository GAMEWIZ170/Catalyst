const { fsrs, generatorParameters, createEmptyCard, Rating } = require("ts-fsrs");

// FSRS spaces reviews so a card comes back just before it would be forgotten. 0.9 means aim for 90% recall.
// Short-term steps are off: students review in daily sessions, so every rating schedules a day or more ahead.
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_short_term: false }));

// Don't know = Again, Unsure = Hard, Confident = Good.
const RATING = { unknown: Rating.Again, unsure: Rating.Hard, confident: Rating.Good };

// Takes the stored card state (or null for a new one) and a rating, and returns the new state to store.
// "due" is also returned on its own so it can be indexed.
const schedule = (stored, rating, now = new Date()) => {
  const card = stored ? { ...stored, due: new Date(stored.due), last_review: stored.last_review ? new Date(stored.last_review) : undefined } : createEmptyCard(now);
  const next = scheduler.next(card, now, rating).card;
  return { fsrs: next, due: next.due };
};

module.exports = { schedule, RATING, Rating };
