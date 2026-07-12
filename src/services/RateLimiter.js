/**
 * @file RateLimiter — protects the bot from command abuse.
 *
 * Two independent mechanisms:
 *  1. Per-user, per-command cooldown (must wait before reusing a command).
 *  2. Per-user global rate limit (max N command invocations per window).
 */

export class RateLimiter {
  /**
   * @param {{
   *   cooldownMs: number,
   *   limit: number,
   *   windowMs: number
   * }} opts
   */
  constructor({ cooldownMs, limit, windowMs }) {
    this.cooldownMs = cooldownMs;
    this.limit = limit;
    this.windowMs = windowMs;

    /** @private userId -> { command: lastUsedAt } */
    this._cooldowns = new Map();
    /** @private userId -> { windowStart, count } */
    this._rates = new Map();
  }

  /**
   * Check whether a user may run a command now.
   * @param {string} userId
   * @param {string} command
   * @returns {{ allowed: boolean, reason?: 'cooldown'|'ratelimit', retryAfterSec?: number }}
   */
  check(userId, command) {
    const now = Date.now();

    // Cooldown (per command).
    const cd = this._cooldowns.get(userId);
    if (cd && cd[command]) {
      const remaining = this.cooldownMs - (now - cd[command]);
      if (remaining > 0) {
        return { allowed: false, reason: 'cooldown', retryAfterSec: Math.ceil(remaining / 1000) };
      }
    }

    // Global rate limit (per user).
    let rate = this._rates.get(userId);
    if (!rate || now - rate.windowStart >= this.windowMs) {
      rate = { windowStart: now, count: 0 };
      this._rates.set(userId, rate);
    }
    if (rate.count >= this.limit) {
      const remaining = this.windowMs - (now - rate.windowStart);
      return { allowed: false, reason: 'ratelimit', retryAfterSec: Math.ceil(remaining / 1000) };
    }

    return { allowed: true };
  }

  /**
   * Record a successful command invocation (call after check() passes).
   * @param {string} userId
   * @param {string} command
   */
  record(userId, command) {
    const now = Date.now();

    const cd = this._cooldowns.get(userId) || {};
    cd[command] = now;
    this._cooldowns.set(userId, cd);

    let rate = this._rates.get(userId);
    if (!rate || now - rate.windowStart >= this.windowMs) {
      rate = { windowStart: now, count: 1 };
    } else {
      rate.count += 1;
    }
    this._rates.set(userId, rate);
  }

  /** Forget a user's cooldown/rate state (e.g. on unban). */
  reset(userId) {
    this._cooldowns.delete(userId);
    this._rates.delete(userId);
  }
}

export default RateLimiter;
