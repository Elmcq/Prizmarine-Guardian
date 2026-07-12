/**
 * @file BanRepository — CRUD for ban records (data/bans.json).
 * A ban is active while `Date.now() < expiresAt`.
 */

export class BanRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.bans;
  }

  /**
   * Create a ban record (does not remove the user from the group).
   * @param {string} groupId
   * @param {string} userId
   * @param {string} reason
   * @param {number} durationMs
   * @returns {Promise<object>}
   */
  async add(groupId, userId, reason, durationMs) {
    const now = Date.now();
    const record = {
      id: this.dbService.uuid(),
      groupId,
      userId,
      reason,
      bannedAt: now,
      expiresAt: now + durationMs,
    };
    this.db.data.records.push(record);
    await this.dbService.persist(this.db);
    return record;
  }

  /**
   * Whether a user currently has an active (non-expired) ban.
   * @param {string} userId
   * @returns {boolean}
   */
  isBanned(userId) {
    const now = Date.now();
    return this.db.data.records.some((r) => r.userId === userId && r.expiresAt > now);
  }

  /**
   * Return bans whose expiry is at or before `now`.
   * @param {number} now
   * @returns {object[]}
   */
  getExpired(now = Date.now()) {
    return this.db.data.records.filter((r) => r.expiresAt <= now);
  }

  /**
   * Remove every ban record for a user (called on manual/auto unban).
   * @param {string} userId
   * @returns {Promise<number>} number of records removed.
   */
  async removeByUser(userId) {
    const before = this.db.data.records.length;
    this.db.data.records = this.db.data.records.filter((r) => r.userId !== userId);
    const removed = before - this.db.data.records.length;
    if (removed > 0) await this.dbService.persist(this.db);
    return removed;
  }

  /** @returns {object[]} All ban records (active + expired). */
  all() {
    return this.db.data.records;
  }

  /** @returns {number} Count of currently active bans. */
  activeCount() {
    const now = Date.now();
    return this.db.data.records.filter((r) => r.expiresAt > now).length;
  }
}

export default BanRepository;
