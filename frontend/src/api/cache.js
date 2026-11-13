// A small read cache for student screens. It does two jobs:
// 1. Two callers asking for the same thing at the same time share one request.
// 2. A screen opened again within a minute gets the earlier answer at once.
// Anything a student does that changes progress (finishing a lesson, submitting a test, rating a card)
// clears it. It is also cleared on login and logout, because it holds one person's data.
const TTL_MS = 60 * 1000;
const entries = new Map();

export function cached(key, load, ttl = TTL_MS) {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.promise;
  const entry = { at: Date.now(), promise: load() };
  entries.set(key, entry);
  // A failed request is not worth keeping: the next call tries again.
  entry.promise.catch(() => { if (entries.get(key) === entry) entries.delete(key); });
  return entry.promise;
}

export function clearCache() {
  entries.clear();
}
