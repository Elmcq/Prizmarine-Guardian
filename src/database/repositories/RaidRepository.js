/**
 * @file RaidRepository — reads/writes the Anti Raid module configuration,
 * Raid Mode state and incident log stored in data/raid.json (managed by
 * DatabaseService).
 *
 * Nothing here is hard-coded: thresholds, sensitivity multipliers and the
 * enable flags are all loaded from the JSON file. Raid Mode state (which
 * groups are currently in lockdown) and the incident log are persisted so
 * they survive restarts until the SchedulerService expires them.
 */

export class RaidRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.raid;
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

  /** @returns {boolean} Whether thresholds auto-enable Raid Mode. */
  isAutoRaidMode() {
    return Boolean(this.db.data.autoRaidMode);
  }

  /** @returns {boolean} Whether admins are DM-notified on activation. */
  isNotifyAdmins() {
    return Boolean(this.db.data.notifyAdmins);
  }

  /**
   * @returns {{
   *   enabled: boolean,
   *   autoRaidMode: boolean,
   *   raidModeDurationMs: number,
   *   notifyAdmins: boolean,
   *   thresholds: object,
   *   sensitivity: object
   * }}
   */
  getSettings() {
    const d = this.db.data;
    return {
      enabled: Boolean(d.enabled),
      autoRaidMode: Boolean(d.autoRaidMode),
      raidModeDurationMs: d.raidModeDurationMs ?? 300_000,
      notifyAdmins: Boolean(d.notifyAdmins),
      thresholds: d.thresholds || {},
      sensitivity: d.sensitivity || {},
    };
  }

  /** @returns {Record<string, {active: boolean, since: number|null, until: number|null}>} */
  getRaidModeMap() {
    return this.db.data.raidMode || {};
  }

  /**
   * Persist Raid Mode state for a group.
   * @param {string} groupId
   * @param {{active: boolean, since: number|null, until: number|null}} state
   * @returns {Promise<void>}
   */
  async setRaidMode(groupId, state) {
    if (!this.db.data.raidMode) this.db.data.raidMode = {};
    this.db.data.raidMode[groupId] = state;
    await this.dbService.persist(this.db);
  }

  /** Re-read raid.json from disk (used by `!reloadraid`). */
  async reload() {
    await this.dbService.raid.read();
    return this.getSettings();
  }

  /**
   * Update a subset of module settings and persist. Used by the web dashboard.
   * Only `autoRaidMode`, `notifyAdmins` and `raidModeDurationMs` are
   * recognised; unknown or invalid values are ignored. `enabled` is handled
   * separately by `setEnabled()`.
   * @param {Partial<{ autoRaidMode: boolean, notifyAdmins: boolean, raidModeDurationMs: number }>} partial
   * @returns {Promise<ReturnType<RaidRepository['getSettings']>>}
   */
  async updateSettings(partial = {}) {
    const d = this.db.data;
    if (partial.autoRaidMode !== undefined) {
      d.autoRaidMode = Boolean(partial.autoRaidMode);
    }
    if (partial.notifyAdmins !== undefined) {
      d.notifyAdmins = Boolean(partial.notifyAdmins);
    }
    if (partial.raidModeDurationMs !== undefined) {
      const n = Number(partial.raidModeDurationMs);
      if (Number.isFinite(n) && n >= 1000) d.raidModeDurationMs = Math.floor(n);
    }
    await this.dbService.persist(this.db);
    return this.getSettings();
  }

  /**
   * Record a raid incident.
   * @param {object} incident - { timestamp, group, type, users? }
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
   * Aggregate statistics for the `!raidstatus` / `!stats` commands.
   * @returns {{ total: number, byType: Record<string, number>, activeRaidModes: number }}
   */
  getStats() {
    const incidents = this.getIncidents();
    const byType = {};
    for (const i of incidents) {
      const t = i.type || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
    }
    const activeRaidModes = Object.values(this.getRaidModeMap()).filter((s) => s && s.active).length;
    return { total: incidents.length, byType, activeRaidModes };
  }
}

export default RaidRepository;
