/**
 * @file cooldownMiddleware — generic in-memory cooldown for automatic
 * moderation actions. Prevents the bot from acting on the same trigger
 * repeatedly within a short window (e.g. a burst of identical toxic messages
 * from one user that the spam service hasn't yet collapsed).
 */

/** @private key -> last-action timestamp (ms) */
const store = new Map();

/**
 * Whether a key is currently cooling down.
 * @param {string} key
 * @param {number} ms
 * @returns {boolean}
 */
export function isOnCooldown(key, ms) {
  const last = store.get(key);
  return Boolean(last && Date.now() - last < ms);
}

/**
 * Mark a key as having just acted (starts its cooldown).
 * @param {string} key
 * @param {number} [ms]
 */
export function markCooldown(key, ms = 1000) {
  store.set(key, Date.now());
  // Lazy cleanup to avoid unbounded growth.
  if (store.size > 5000) {
    for (const [k, t] of store) {
      if (Date.now() - t >= ms) store.delete(k);
    }
  }
}
