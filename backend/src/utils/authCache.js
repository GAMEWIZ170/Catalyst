// Every request checks that the logged-in user still exists and is active. That is one database round trip
// (about 120 ms to a far Atlas cluster) before the real work starts. This keeps the answer for a few seconds.
// Admin changes to a user call forget(), so a deactivation takes effect at once on this server.
const TTL_MS = 15 * 1000;
const MAX_ENTRIES = 2000;
const entries = new Map();

const get = (id) => {
  const entry = entries.get(id);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    entries.delete(id);
    return null;
  }
  return entry.user;
};

const set = (id, user) => {
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
  entries.set(id, { user, at: Date.now() });
};

const forget = (id) => entries.delete(String(id));

module.exports = { get, set, forget };
