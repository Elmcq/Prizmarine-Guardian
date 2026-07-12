const ACTIONS = new Set(['warn', 'tempban', 'ban']);
const SEVERITIES = new Set(['low', 'normal', 'high', 'critical']);

export class SettingsRepository {
 constructor(dbService) {
 this.dbService = dbService;
 this.db = dbService.settings;
 }

 getInviteLink(groupId) {
 return this.db.data.groupInviteLinks?.[groupId];
 }

 async setInviteLink(groupId, link) {
 if (!this.db.data.groupInviteLinks) this.db.data.groupInviteLinks = {};
 this.db.data.groupInviteLinks[groupId] = link;
 await this.dbService.persist(this.db);
 }

 getAllInviteLinks() {
 return this.db.data.groupInviteLinks || {};
 }

 async incMessagesSeen(n = 1, flushEvery = 25) {
 this.db.data.messagesSeen = (this.db.data.messagesSeen || 0) + n;
 if (this.db.data.messagesSeen % flushEvery === 0) await this.dbService.persist(this.db);
 }

 getMessagesSeen() {
 return this.db.data.messagesSeen || 0;
 }

 async incBlockedMessages(n = 1) {
 this.db.data.blockedMessages = (this.db.data.blockedMessages || 0) + n;
 await this.dbService.persist(this.db);
 }

 getBlockedMessages() {
 return this.db.data.blockedMessages || 0;
 }

 getWarningEscalation(fallbackLimit = 3, fallbackDurationMs = 3_600_000) {
 const stored = this.db.data.warningEscalation;
 if (stored?.levels?.length) return structuredClone(stored);
 const limit = Math.max(1, Number(fallbackLimit) || 3);
 const levels = [
 { threshold: 1, severity: 'normal', action: 'warn' },
 ];
 if (limit > 1) levels.push({ threshold: Math.max(2, limit - 1), severity: 'high', action: 'warn' });
 levels.push({ threshold: limit, severity: 'critical', action: 'tempban', durationMs: fallbackDurationMs });
 return { enabled: true, levels };
 }

 async setWarningEscalation(input) {
 if (!input || !Array.isArray(input.levels) || input.levels.length === 0) {
 throw new Error('At least one escalation level is required.');
 }
 const levels = input.levels.map((level) => {
 const threshold = Number(level.threshold);
 const action = String(level.action || '').toLowerCase();
 const severity = String(level.severity || '').toLowerCase();
 if (!Number.isInteger(threshold) || threshold < 1) throw new Error('Thresholds must be positive integers.');
 if (!ACTIONS.has(action)) throw new Error(`Unsupported escalation action: ${action}`);
 if (!SEVERITIES.has(severity)) throw new Error(`Unsupported escalation severity: ${severity}`);
 const normalized = { threshold, severity, action };
 if (action === 'tempban') {
 const durationMs = Number(level.durationMs);
 if (!Number.isFinite(durationMs) || durationMs < 60_000) throw new Error('Tempban duration must be at least 60000ms.');
 normalized.durationMs = Math.floor(durationMs);
 }
 return normalized;
 }).sort((a, b) => a.threshold - b.threshold);
 if (new Set(levels.map((level) => level.threshold)).size !== levels.length) {
 throw new Error('Escalation thresholds must be unique.');
 }
 this.db.data.warningEscalation = { enabled: input.enabled !== false, levels };
 await this.dbService.persist(this.db);
 return structuredClone(this.db.data.warningEscalation);
 }
}

export default SettingsRepository;
