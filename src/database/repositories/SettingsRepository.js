/**
 * @file SettingsRepository — app settings (data/settings.json).
 * Stores per-group invite links (used to DM unbanned users) and a
 * running counter of messages seen.
 */

export class SettingsRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.settings;
  }

  /**
   * Get the stored invite link for a group (if any).
   * @param {string} groupId
   * @returns {string|undefined}
   */
  getInviteLink(groupId) {
    return this.db.data.groupInviteLinks?.[groupId];
  }

  /**
   * Store (or overwrite) an invite link for a group.
   * @param {string} groupId
   * @param {string} link
   * @returns {Promise<void>}
   */
  async setInviteLink(groupId, link) {
    if (!this.db.data.groupInviteLinks) this.db.data.groupInviteLinks = {};
    this.db.data.groupInviteLinks[groupId] = link;
    await this.dbService.persist(this.db);
  }

  /** @returns {Record<string,string>} All stored invite links. */
  getAllInviteLinks() {
    return this.db.data.groupInviteLinks || {};
  }

  /**
   * Increment the messages-seen counter. Writes are throttled to at
   * most once per `flushEvery` calls to reduce disk churn.
   * @param {number} [n=1]
   * @param {number} [flushEvery=25]
   * @returns {Promise<void>}
   */
  async incMessagesSeen(n = 1, flushEvery = 25) {
    this.db.data.messagesSeen = (this.db.data.messagesSeen || 0) + n;
    if (this.db.data.messagesSeen % flushEvery === 0) {
      await this.dbService.persist(this.db);
    }
  }

  /** @returns {number} Total messages seen since last reset. */
  getMessagesSeen() {
    return this.db.data.messagesSeen || 0;
  }
}

export default SettingsRepository;
