/**
 * @file NSFWRepository — reads/writes the NSFW module configuration and
 * incident log stored in data/nsfw.json (managed by DatabaseService).
 *
 * Nothing here is hard-coded: categories, limits and the enable flag are all
 * loaded from the JSON file. Incidents (every NSFW event) are appended here
 * and aggregated for the `!stats` command.
 */

export class NSFWRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.nsfw;
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
   *   warnLimit: number,
   *   highSeverityBan: boolean,
   *   categories: Record<string, string[]>
   * }}
   */
  getSettings() {
    const d = this.db.data;
    return {
      enabled: Boolean(d.enabled),
      warnLimit: d.warnLimit ?? 3,
      highSeverityBan: Boolean(d.highSeverityBan),
      categories: d.categories || {},
    };
  }

  /** Re-read nsfw.json from disk (used by `!reloadnsfw`). */
  async reload() {
    await this.dbService.nsfw.read();
    return this.getSettings();
  }

  /**
   * Update a subset of module settings and persist. Used by the web dashboard.
   * Only `warnLimit` and `highSeverityBan` are recognised; unknown or invalid
   * values are ignored. `enabled` is handled separately by `setEnabled()`.
   * @param {Partial<{ warnLimit: number, highSeverityBan: boolean }>} partial
   * @returns {Promise<ReturnType<NSFWRepository['getSettings']>>}
   */
  async updateSettings(partial = {}) {
    const d = this.db.data;
    if (partial.warnLimit !== undefined) {
      const n = Number(partial.warnLimit);
      if (Number.isFinite(n) && n >= 1) d.warnLimit = Math.floor(n);
    }
    if (partial.highSeverityBan !== undefined) {
      d.highSeverityBan = Boolean(partial.highSeverityBan);
    }
    await this.dbService.persist(this.db);
    return this.getSettings();
  }

  /**
   * Record an NSFW incident.
   * @param {object} incident - { timestamp, group, user, category, severity, matched, action }
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
   * Aggregate statistics for the `!stats` command.
   * @returns {{ detections: number, warnings: number, bans: number, mostTriggeredCategory: string|null }}
   */
  getStats() {
    const incidents = this.getIncidents();
    const warnings = incidents.filter((i) => i.action === 'warn').length;
    const bans = incidents.filter((i) => i.action === 'ban').length;
    const byCategory = {};
    for (const i of incidents) {
      byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    }
    let mostTriggeredCategory = null;
    let max = 0;
    for (const [category, count] of Object.entries(byCategory)) {
      if (count > max) {
        max = count;
        mostTriggeredCategory = category;
      }
    }
    return {
      detections: incidents.length,
      warnings,
      bans,
      mostTriggeredCategory,
    };
  }
}

export default NSFWRepository;
