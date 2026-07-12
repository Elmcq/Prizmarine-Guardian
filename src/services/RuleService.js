/**
 * @file RuleService — business logic for the community-rule management system.
 *
 * Responsibilities:
 *  - Load every rule dynamically from data/rules.json (never hard-coded).
 *  - Validate inputs (no duplicate ids, no empty title/description, only the
 *    supported punishments).
 *  - Create / edit / delete rules and emit a `rule:changed` event for logging.
 *  - Help moderation commands resolve a rule reference (e.g. "R2") and an
 *    optional duration token ("7d") from raw command arguments.
 *
 * Persistence is delegated entirely to RuleRepository; this service contains
 * no repository logic of its own.
 */

import { EVENTS, PUNISHMENTS } from '../config/constants.js';
import { parseDuration } from '../utils/time.js';

export class RuleService {
  /**
   * @param {object} deps
   * @param {import('../database/repositories/RuleRepository.js').RuleRepository} deps.repo
   * @param {import('winston').Logger} deps.logger
   * @param {import('../events/EventBus.js').EventBus} deps.eventBus
   */
  constructor({ repo, logger, eventBus }) {
    this.repo = repo;
    this.logger = logger;
    this.eventBus = eventBus;
  }

  /** @returns {Record<string, {title:string, description:string, punishment:string}>} */
  getRules() {
    return this.repo.getRules();
  }

  /**
   * All rules as an array, sorted by id (numeric suffix when present).
   * @returns {Array<{id:string, title:string, description:string, punishment:string}>}
   */
  listRules() {
    const rules = this.getRules();
    return Object.keys(rules)
      .sort((a, b) => this._sortKey(a, b))
      .map((id) => ({ id, ...rules[id] }));
  }

  /**
   * Look up a single rule by id (case-insensitive).
   * @param {string} id
   * @returns {{id:string, title:string, description:string, punishment:string}|null}
   */
  getRule(id) {
    if (!id) return null;
    const rules = this.getRules();
    const key = Object.keys(rules).find(
      (k) => k.toLowerCase() === String(id).toLowerCase(),
    );
    return key ? { id: key, ...rules[key] } : null;
  }

  /**
   * @param {string} punishment
   * @returns {boolean}
   */
  isPunishmentValid(punishment) {
    if (!punishment) return false;
    return PUNISHMENTS.LIST.some((p) => p.toLowerCase() === String(punishment).toLowerCase());
  }

  /** Normalise a punishment to the canonical casing, or null if invalid. */
  normalizePunishment(punishment) {
    return (
      PUNISHMENTS.LIST.find((p) => p.toLowerCase() === String(punishment).toLowerCase()) ||
      null
    );
  }

  /**
   * Create a rule.
   * @param {{ id:string, title:string, description:string, punishment:string }} input
   * @param {string} [moderatorId]
   * @returns {Promise<{id:string, title:string, description:string, punishment:string}>}
   * @throws {Error} on duplicate id / empty fields / invalid punishment.
   */
  async addRule(input, moderatorId) {
    const id = String(input?.id || '').trim();
    const title = String(input?.title || '').trim();
    const description = String(input?.description || '').trim();
    const punishment = String(input?.punishment || '').trim();

    if (!id) throw new Error('Rule ID cannot be empty.');
    if (this.getRule(id)) throw new Error(`Rule ID "${id}" already exists.`);
    if (!title) throw new Error('Rule title cannot be empty.');
    if (!description) throw new Error('Rule description cannot be empty.');
    const norm = this.normalizePunishment(punishment);
    if (!norm) {
      throw new Error(`Invalid punishment "${punishment}". Use: ${PUNISHMENTS.LIST.join(', ')}.`);
    }

    const rule = { title, description, punishment: norm };
    await this.repo.addRule(id, rule);
    this._log('created', moderatorId, { ruleId: id, old: null, new: rule });
    return { id, ...rule };
  }

  /**
   * Edit a single field of a rule.
   * @param {string} id
   * @param {'title'|'description'|'punishment'} field
   * @param {string} value
   * @param {string} [moderatorId]
   * @returns {Promise<{id:string, field:string, old:string, new:string, unchanged?:boolean}>}
   */
  async editRule(id, field, value, moderatorId) {
    const existing = this.getRule(id);
    if (!existing) throw new Error(`Rule "${id}" not found.`);

    const allowed = ['title', 'description', 'punishment'];
    if (!allowed.includes(field)) {
      throw new Error(`Cannot edit "${field}". Allowed fields: ${allowed.join(', ')}.`);
    }

    const clean = String(value || '').trim();
    if (field === 'title' && !clean) throw new Error('Rule title cannot be empty.');
    if (field === 'description' && !clean) throw new Error('Rule description cannot be empty.');

    let finalValue = clean;
    if (field === 'punishment') {
      const norm = this.normalizePunishment(clean);
      if (!norm) {
        throw new Error(`Invalid punishment "${clean}". Use: ${PUNISHMENTS.LIST.join(', ')}.`);
      }
      finalValue = norm;
    }

    const oldValue = existing[field];
    if (oldValue === finalValue) {
      return { id: existing.id, field, old: oldValue, new: finalValue, unchanged: true };
    }

    await this.repo.updateRule(existing.id, { [field]: finalValue });
    this._log('edited', moderatorId, { ruleId: existing.id, field, old: oldValue, new: finalValue });
    return { id: existing.id, field, old: oldValue, new: finalValue };
  }

  /**
   * Delete a rule.
   * @param {string} id
   * @param {string} [moderatorId]
   * @returns {Promise<{id:string, title:string, description:string, punishment:string}>}
   */
  async deleteRule(id, moderatorId) {
    const existing = this.getRule(id);
    if (!existing) throw new Error(`Rule "${id}" not found.`);
    await this.repo.deleteRule(existing.id);
    this._log('deleted', moderatorId, { ruleId: existing.id, old: existing, new: null });
    return existing;
  }

  /** @returns {string} Pretty-printed rules.json content for export. */
  exportJSON() {
    return JSON.stringify({ rules: this.getRules() }, null, 2);
  }

  /**
   * Extract a rule id from a raw command token (case-insensitive).
   * @param {string} token
   * @returns {string|null}
   */
  findRuleToken(token) {
    const r = this.getRule(token);
    return r ? r.id : null;
  }

  /**
   * Parse raw moderation command arguments into a rule reference, an optional
   * duration, and any remaining manual text.
   *
   * Example for `!warn @user R2 extra note`:
   *   args = ["@user", "R2", "extra", "note"]  ->  { ruleId: "R2", ... }
   * Example for `!tempban @user 7d R5`:
   *   args = ["@user", "7d", "R5"]  ->  { ruleId: "R5", durationMs: 604800000 }
   *
   * @param {string[]} args
   * @param {string[]} [mentionedIds]
   * @param {{ withDuration?: boolean }} [opts]
   * @returns {{ ruleId: string|null, rule: object|null, durationMs: number|null, rest: string[] }}
   */
  parseModerationArgs(args, mentionedIds = [], opts = {}) {
    const mentionTokens = new Set(
      (mentionedIds || []).map((id) => `@${String(id).split('@')[0]}`),
    );
    const rules = this.getRules();
    const keys = Object.keys(rules);

    let ruleId = null;
    let durationMs = null;
    const rest = [];

    for (const a of args || []) {
      if (mentionTokens.has(a)) continue;

      if (!ruleId) {
        const key = keys.find((k) => k.toLowerCase() === String(a).toLowerCase());
        if (key) {
          ruleId = key;
          continue;
        }
      }

      if (opts?.withDuration && durationMs === null) {
        const ms = parseDuration(a);
        if (ms !== null) {
          durationMs = ms;
          continue;
        }
      }

      rest.push(a);
    }

    const rule = ruleId ? { id: ruleId, ...rules[ruleId] } : null;
    return { ruleId, rule, durationMs, rest };
  }

  /** @private */
  _log(action, moderatorId, detail) {
    const payload = {
      action,
      moderator: moderatorId || 'unknown',
      timestamp: Date.now(),
      ...detail,
    };
    this.eventBus.emit(EVENTS.RULE_CHANGED, payload);
    this.logger.info('Rule changed', payload);
  }

  /** @private Sort keys numerically when they look like `R<n>`, else lexicographic. */
  _sortKey(a, b) {
    const ma = /^R(\d+)$/i.exec(a);
    const mb = /^R(\d+)$/i.exec(b);
    if (ma && mb) return Number(ma[1]) - Number(mb[1]);
    return a.localeCompare(b);
  }
}

export default RuleService;
