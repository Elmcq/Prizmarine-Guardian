/**
 * @file rateLimitMiddleware — command abuse protection.
 * Thin wrapper around RateLimiter: checks both the per-command cooldown and
 * the per-user global rate limit, and records the invocation on success.
 */

/**
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.command - command name
 * @param {import('../services/RateLimiter.js').RateLimiter} p.rateLimiter
 * @returns {{ allowed: boolean, reason?: 'cooldown'|'ratelimit', retryAfterSec?: number }}
 */
export function guardCommand({ userId, command, rateLimiter }) {
  const result = rateLimiter.check(userId, command);
  if (result.allowed) {
    rateLimiter.record(userId, command);
  }
  return result;
}
