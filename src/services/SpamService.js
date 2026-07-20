/**
 * @file SpamService — in-memory anti-spam and anti-flood detection.
 *
 *  - Anti-spam: the same user sending >= N messages within a sliding window.
 *  - Anti-flood: the same user sending >= M *identical* consecutive messages.
 *
 * State is intentionally in-memory (ephemeral); it is cleared on restart,
 * which is acceptable because it targets burst behaviour, not history.
 */

export class SpamService {
  /**
   * @param {{
   *   spamCount: number,
   *   spamWindow: number,
   *   floodCount: number
   * }} limits
   */
  constructor({ spamCount, spamWindow, floodCount }) {
    this.spamCount = spamCount;
    this.spamWindow = spamWindow;
    this.floodCount = floodCount;
    /** @private key "groupId:userId" -> { timestamps:number[], lastText:string|null, streak:number } */
    this._state = new Map();
    this._cleanupInterval = setInterval(() => this._cleanup(), Math.min(spamWindow, 60000));
  }

  /** @private Periodic cleanup to prevent memory leaks */
  _cleanup() {
    const now = Date.now();
    const maxAge = Math.max(this.spamWindow, 60000);
    for (const [key, rec] of this._state.entries()) {
      if (rec.timestamps.length === 0 && !rec.lastText) {
        this._state.delete(key);
      } else {
        rec.timestamps = rec.timestamps.filter(t => now - t <= maxAge);
      }
    }
  }

  /**
   * Record a message and classify any abuse.
   * @param {string} groupId
   * @param {string} userId
   * @param {string} text
   * @returns {'spam'|'flood'|null}
   */
  check(groupId, userId, text) {
    const key = `${groupId}:${userId}`;
    const now = Date.now();
    let rec = this._state.get(key);
    if (!rec) {
      rec = { timestamps: [], lastText: null, streak: 0 };
      this._state.set(key, rec);
    }

    // ---- Anti-spam: message-frequency window ----
    rec.timestamps.push(now);
    rec.timestamps = rec.timestamps.filter((t) => now - t <= this.spamWindow);
    if (rec.timestamps.length >= this.spamCount) {
      // Reset so a single burst doesn't trigger repeatedly.
      rec.timestamps = [];
      return 'spam';
    }

    // ---- Anti-flood: identical consecutive messages ----
    const clean = (text || '').trim();
    if (clean && clean === rec.lastText) {
      rec.streak += 1;
    } else {
      rec.streak = 1;
    }
    rec.lastText = clean;
    if (rec.streak >= this.floodCount) {
      rec.streak = 0;
      rec.lastText = null;
      return 'flood';
    }

    return null;
  }

  /** Reset tracking for a specific user (e.g. after a warning). */
  reset(groupId, userId) {
    this._state.delete(`${groupId}:${userId}`);
  }

  /** Clear all tracking state and stop cleanup interval. */
  clear() {
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
    this._state.clear();
  }
}

export default SpamService;
