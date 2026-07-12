/**
 * @file RuleRepository — reads/writes the community rules stored in
 * data/rules.json (managed by DatabaseService).
 *
 * This repository is intentionally tiny: it only performs persistence. All
 * validation, lookup and formatting lives in RuleService so the rules stay
 * declarative and the repository never duplicates business logic.
 *
 * The on-disk shape is `{ rules: { R1: { title, description, punishment }, ... } }`.
 * Nothing here is hard-coded — every rule is loaded dynamically from the JSON.
 */

export class RuleRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.rules;
  }

  /** @returns {Record<string, {title:string, description:string, punishment:string}>} */
  getRules() {
    if (!this.db.data.rules || typeof this.db.data.rules !== 'object') {
      this.db.data.rules = {};
    }
    return this.db.data.rules;
  }

  /** Re-read rules.json from disk (defensive; used after external edits). */
  async reload() {
    await this.dbService.rules.read();
    return this.getRules();
  }

  /**
   * Persist a single rule (create or replace).
   * @param {string} id
   * @param {{ title:string, description:string, punishment:string }} rule
   * @returns {Promise<void>}
   */
  async addRule(id, rule) {
    this.getRules()[id] = { ...rule };
    await this.dbService.persist(this.db);
  }

  /**
   * Patch fields of an existing rule.
   * @param {string} id
   * @param {Partial<{title:string, description:string, punishment:string}>} patch
   * @returns {Promise<void>}
   */
  async updateRule(id, patch) {
    const rules = this.getRules();
    rules[id] = { ...rules[id], ...patch };
    await this.dbService.persist(this.db);
  }

  /**
   * Remove a rule by id.
   * @param {string} id
   * @returns {Promise<boolean>} true if a rule was removed.
   */
  async deleteRule(id) {
    const rules = this.getRules();
    if (!(id in rules)) return false;
    delete rules[id];
    await this.dbService.persist(this.db);
    return true;
  }

  /**
   * Aggregate a small statistic block for the `!stats` command.
   * @returns {{ total: number, byPunishment: Record<string, number> }}
   */
  getStats() {
    const rules = this.getRules();
    const byPunishment = {};
    for (const r of Object.values(rules)) {
      const p = r.punishment || 'Unknown';
      byPunishment[p] = (byPunishment[p] || 0) + 1;
    }
    return { total: Object.keys(rules).length, byPunishment };
  }
}

export default RuleRepository;
