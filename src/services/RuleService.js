import { EVENTS, PUNISHMENTS, RULE_SEVERITIES } from '../config/constants.js';
import { parseDuration } from '../utils/time.js';

export class RuleService {
 constructor({ repo, logger, eventBus }) {
 this.repo = repo;
 this.logger = logger;
 this.eventBus = eventBus;
 this.cooldowns = new Map();
 }

 normalizeRule(rule = {}) {
 return {
 title: String(rule.title || ''),
 description: String(rule.description || ''),
 punishment: rule.punishment || 'Warn',
 severity: RULE_SEVERITIES.includes(String(rule.severity).toLowerCase())
 ? String(rule.severity).toLowerCase()
 : 'medium',
 cooldown: Number.isFinite(Number(rule.cooldown)) && Number(rule.cooldown) >= 0
 ? Math.floor(Number(rule.cooldown))
 : 0,
 enabled: rule.enabled !== false,
 };
 }

 getRules() {
 return this.repo.getRules();
 }

 listRules({ includeDisabled = false } = {}) {
 return Object.keys(this.getRules())
 .sort((a, b) => this._sortKey(a, b))
 .map((id) => ({ id, ...this.normalizeRule(this.getRules()[id]) }))
 .filter((rule) => includeDisabled || rule.enabled);
 }

 getRule(id) {
 if (!id) return null;
 const rules = this.getRules();
 const key = Object.keys(rules).find((item) => item.toLowerCase() === String(id).toLowerCase());
 return key ? { id: key, ...this.normalizeRule(rules[key]) } : null;
 }

 normalizePunishment(punishment) {
 return PUNISHMENTS.LIST.find((item) => item.toLowerCase() === String(punishment).toLowerCase()) || null;
 }

 normalizeInput(input, partial = false) {
 const output = {};
 if (!partial || input.title !== undefined) {
 output.title = String(input.title || '').trim();
 if (!output.title) throw new Error('Rule title cannot be empty.');
 }
 if (!partial || input.description !== undefined) {
 output.description = String(input.description || '').trim();
 if (!output.description) throw new Error('Rule description cannot be empty.');
 }
 if (!partial || input.punishment !== undefined) {
 const punishment = this.normalizePunishment(input.punishment);
 if (!punishment) throw new Error(`Invalid punishment. Use: ${PUNISHMENTS.LIST.join(', ')}.`);
 output.punishment = punishment;
 }
 if (!partial || input.severity !== undefined) {
 const severity = String(input.severity || 'medium').toLowerCase();
 if (!RULE_SEVERITIES.includes(severity)) throw new Error(`Invalid severity. Use: ${RULE_SEVERITIES.join(', ')}.`);
 output.severity = severity;
 }
 if (!partial || input.cooldown !== undefined) {
 const cooldown = Number(input.cooldown || 0);
 if (!Number.isFinite(cooldown) || cooldown < 0) throw new Error('Cooldown must be zero or a positive number of milliseconds.');
 output.cooldown = Math.floor(cooldown);
 }
 if (!partial || input.enabled !== undefined) {
 output.enabled = input.enabled === true || input.enabled === 'true';
 }
 return output;
 }

 async addRule(input, moderatorId) {
 const id = String(input?.id || '').trim();
 if (!id) throw new Error('Rule ID cannot be empty.');
 if (this.getRule(id)) throw new Error(`Rule ID "${id}" already exists.`);
 const rule = this.normalizeInput(input);
 await this.repo.addRule(id, rule);
 this._log('created', moderatorId, { ruleId: id, old: null, new: rule });
 return { id, ...rule };
 }

 async editRule(id, field, value, moderatorId) {
 const existing = this.getRule(id);
 if (!existing) throw new Error(`Rule "${id}" not found.`);
 const allowed = ['title', 'description', 'punishment', 'severity', 'cooldown', 'enabled'];
 if (!allowed.includes(field)) throw new Error(`Allowed fields: ${allowed.join(', ')}.`);
 const patch = this.normalizeInput({ [field]: value }, true);
 const finalValue = patch[field];
 if (existing[field] === finalValue) {
 return { id: existing.id, field, old: existing[field], new: finalValue, unchanged: true };
 }
 await this.repo.updateRule(existing.id, patch);
 this._log('edited', moderatorId, { ruleId: existing.id, field, old: existing[field], new: finalValue });
 return { id: existing.id, field, old: existing[field], new: finalValue };
 }

 async updateRule(id, patch, moderatorId) {
 const existing = this.getRule(id);
 if (!existing) throw new Error(`Rule "${id}" not found.`);
 const normalized = this.normalizeInput(patch, true);
 await this.repo.updateRule(existing.id, normalized);
 const updated = this.getRule(existing.id);
 this._log('edited', moderatorId, { ruleId: existing.id, old: existing, new: updated });
 return updated;
 }

 async deleteRule(id, moderatorId) {
 const existing = this.getRule(id);
 if (!existing) throw new Error(`Rule "${id}" not found.`);
 await this.repo.deleteRule(existing.id);
 this._log('deleted', moderatorId, { ruleId: existing.id, old: existing, new: null });
 return existing;
 }

 exportJSON() {
 return JSON.stringify({ rules: this.getRules() }, null, 2);
 }

 consumeRule(rule, groupId, targetId) {
 if (!rule?.enabled) throw new Error(`Rule "${rule?.id || ''}" is disabled.`);
 if (!rule.cooldown) return;
 const key = `${rule.id}:${groupId || 'direct'}:${targetId || 'unknown'}`;
 const now = Date.now();
 const expiresAt = this.cooldowns.get(key) || 0;
 if (expiresAt > now) {
 const seconds = Math.ceil((expiresAt - now) / 1000);
 throw new Error(`Rule ${rule.id} is on cooldown for ${seconds}s.`);
 }
 this.cooldowns.set(key, now + rule.cooldown);
 }

 parseModerationArgs(args, mentionedIds = [], opts = {}) {
 const mentionTokens = new Set((mentionedIds || []).map((id) => `@${String(id).split('@')[0]}`));
 const rules = this.getRules();
 const keys = Object.keys(rules);
 let ruleId = null;
 let durationMs = null;
 const rest = [];
 for (const arg of args || []) {
 if (mentionTokens.has(arg)) continue;
 if (!ruleId) {
 const key = keys.find((item) => item.toLowerCase() === String(arg).toLowerCase());
 if (key && this.normalizeRule(rules[key]).enabled) {
 ruleId = key;
 continue;
 }
 }
 if (opts.withDuration && durationMs === null) {
 const parsed = parseDuration(arg);
 if (parsed !== null) {
 durationMs = parsed;
 continue;
 }
 }
 rest.push(arg);
 }
 const rule = ruleId ? { id: ruleId, ...this.normalizeRule(rules[ruleId]) } : null;
 return { ruleId, rule, durationMs, rest };
 }

 _log(action, moderatorId, detail) {
 const payload = { action, moderator: moderatorId || 'unknown', timestamp: Date.now(), ...detail };
 this.eventBus.emit(EVENTS.RULE_CHANGED, payload);
 this.logger.info('Rule changed', payload);
 }

 _sortKey(a, b) {
 const first = /^R(\d+)$/i.exec(a);
 const second = /^R(\d+)$/i.exec(b);
 if (first && second) return Number(first[1]) - Number(second[1]);
 return a.localeCompare(b);
 }
}

export default RuleService;
