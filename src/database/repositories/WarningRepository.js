/**
 * @file WarningRepository — CRUD for warning records (data/warnings.json).
 * A record tracks the warning count for a (groupId, userId) pair.
 */

export class WarningRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.warnings;
  }

  /**
   * Find the warning record for a user in a group.
   * @param {string} groupId
   * @param {string} userId
   * @returns {object|null}
   */
  get(groupId, userId) {
    return (
      this.db.data.records.find((r) => r.groupId === groupId && r.userId === userId) || null
    );
  }

  /**
   * Increment (or create) the warning for a user and persist.
   * @param {string} groupId
   * @param {string} userId
   * @param {string} reason
   * @returns {Promise<object>} The updated record.
   */
  async add(groupId, userId, reason) {
    let record = this.get(groupId, userId);
    if (!record) {
      record = {
        id: this.dbService.uuid(),
        groupId,
        userId,
        count: 0,
        reasons: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.db.data.records.push(record);
    }
    record.count += 1;
    record.reasons.push({ reason, at: Date.now() });
    record.updatedAt = Date.now();
    await this.dbService.persist(this.db);
    return record;
  }

  /**
   * Reset a user's warnings to zero (remove the record).
   * @param {string} groupId
   * @param {string} userId
   * @returns {Promise<boolean>} true if a record existed.
   */
  async reset(groupId, userId) {
    const before = this.db.data.records.length;
    this.db.data.records = this.db.data.records.filter(
      (r) => !(r.groupId === groupId && r.userId === userId),
    );
    const changed = before !== this.db.data.records.length;
    if (changed) await this.dbService.persist(this.db);
    return changed;
  }

  /** @returns {object[]} All warning records. */
  all() {
    return this.db.data.records;
  }

  /** @returns {number} Total number of warning records. */
  count() {
    return this.db.data.records.length;
  }
}

export default WarningRepository;
