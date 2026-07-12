/**
 * @file StickerRepository — reads/writes the Anti Sticker Spam module
 * configuration and incident log stored in data/sticker.json (managed by
 * DatabaseService).
 *
 * Nothing here is hard-coded: maxStickers, timeWindow, duplicateLimit,
 * warnLimit and the coordinated thresholds are all loaded from the JSON file.
 * Incidents (every sticker event) are appended here and aggregated for the
 * `!stickerstatus` command.
 */

export class StickerRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.sticker;
  }

  /** @returns {boolean} Whether the module is currently enabled. */
  isEnabled() {
    return Boolean(this.db.data.enabled);
  }

  /**
   * Enable or disable the module and persist.
   * @param {boolean} value
   * @returns {Promise<void>}
   */
  async setEnabled(value) {
    this.db.data.enabled = Boolean(value);
    await this.dbService.persist(this.db);
  }

  /**
   * @returns {{
   *   enabled: boolean,
   *   maxStickers: number,
   *   timeWindow: number,
   *   duplicateLimit: number,
   *   warnLimit: number,
   *   coordinated: { minUsers: number, windowSec: number }
   * }}
   */
  getSettings() {
    const d = this.db.data;
    return {
      enabled: Boolean(d.enabled),
      maxStickers: d.maxStickers ?? 5,
      timeWindow: d.timeWindow ?? 15,
      duplicateLimit: d.duplicateLimit ?? 3,
      warnLimit: d.warnLimit ?? 3,
      coordinated: d.coordinated || { minUsers: 5, windowSec: 10 },
    };
  }

  /** Re-read sticker.json from disk (used by `!reloadsticker`). */
  async reload() {
    await this.dbService.sticker.read();
    return this.getSettings();
  }

  /**
   * Update a subset of module settings and persist. Used by the web dashboard.
   * Only `maxStickers`, `timeWindow`, `duplicateLimit` and `warnLimit` are
   * recognised; unknown or invalid values are ignored. `enabled` is handled
   * separately by `setEnabled()`.
   * @param {Partial<{ maxStickers: number, timeWindow: number, duplicateLimit: number, warnLimit: number }>} partial
   * @returns {Promise<ReturnType<StickerRepository['getSettings']>>}
   */
  async updateSettings(partial = {}) {
    const d = this.db.data;
    for (const key of ['maxStickers', 'timeWindow', 'duplicateLimit', 'warnLimit']) {
      if (partial[key] !== undefined) {
        const n = Number(partial[key]);
        if (Number.isFinite(n) && n >= 1) d[key] = Math.floor(n);
      }
    }
    await this.dbService.persist(this.db);
    return this.getSettings();
  }

  /**
   * Record a sticker incident.
   * @param {object} incident - { timestamp, group, user, type, stickerKey?, action? }
   * @returns {Promise<object>}
   */
  async addIncident(incident) {
    if (!Array.isArray(this.db.data.incidents)) this.db.data.incidents = [];
    const record = { id: this.dbService.uuid(), ...incident };
    this.db.data.incidents.push(record);
    await this.dbService.persist(this.db);
    return record;
  }

  /** @returns {object[]} All recorded incidents. */
  getIncidents() {
    return this.db.data.incidents || [];
  }

  /**
   * Aggregate statistics for the `!stickerstatus` / `!stats` commands.
   * @returns {{ total: number, byType: Record<string, number>, warnings: number, logs: number }}
   */
  getStats() {
    const incidents = this.getIncidents();
    const byType = {};
    let warnings = 0;
    let logs = 0;
    for (const i of incidents) {
      const t = i.type || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
      if (i.action === 'warn') warnings += 1;
      else logs += 1;
    }
    return { total: incidents.length, byType, warnings, logs };
  }
}

export default StickerRepository;
