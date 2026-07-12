/**
 * @file AdvertisementRepository — reads/writes the Anti Advertisement module
 * configuration and incident log stored in data/advertisement.json (managed
 * by DatabaseService).
 *
 * Nothing here is hard-coded: categories, the enable flag, and the non-
 * commercial exemption patterns are all loaded from the JSON file. Incidents
 * (every advertisement event) are appended here and aggregated for `!stats`.
 */

export class AdvertisementRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.advertisement;
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
   *   categories: Record<string, string[]>,
   *   exemptions: Array<{label?: string, pattern: string}>
   * }}
   */
  getSettings() {
    const d = this.db.data;
    return {
      enabled: Boolean(d.enabled),
      warnLimit: d.warnLimit ?? 3,
      highSeverityBan: Boolean(d.highSeverityBan),
      categories: d.categories || {},
      exemptions: d.exemptions || [],
    };
  }

  /** Re-read advertisement.json from disk (used by `!reloadad`). */
  async reload() {
    await this.dbService.advertisement.read();
    return this.getSettings();
  }

  /**
   * Record an advertisement incident.
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

export default AdvertisementRepository;
