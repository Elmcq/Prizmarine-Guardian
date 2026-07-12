import { EVENTS } from '../config/constants.js';

const SETTINGS_COMMANDS = new Set([
 'settings', 'antitoxic', 'reloadtoxic', 'antinsfw', 'antiad', 'antiraid', 'antisticker',
 'raidmode', 'reloadnsfw', 'reloadad', 'reloadraid', 'reloadsticker',
]);

export class AuditService {
 constructor({ repo, eventBus, logger }) {
 this.repo = repo;
 this.eventBus = eventBus;
 this.logger = logger;
 this.listeners = [];
 }

 start() {
 this.listen(EVENTS.TOXICITY_DETECTED, (payload) => ({
 action: 'ANTITOXIC',
 user: payload.targetId,
 moderator: 'Prizmarine Guardian',
 groupId: payload.groupId,
 reason: `Toxic content detected (${payload.category || 'unknown'}: ${payload.keyword || 'pattern'})`,
 details: payload,
 }));
 this.listen(EVENTS.WARNING_ISSUED, (payload) => ({
 action: 'WARNING', user: payload.targetId, moderator: payload.issuerId, groupId: payload.groupId,
 reason: payload.reason, details: { count: payload.count, severity: payload.severity, escalation: payload.escalation },
 }));
 this.listen(EVENTS.USER_KICKED, (payload) => ({
 action: 'KICK', user: payload.targetId, moderator: payload.moderatorId, groupId: payload.groupId, reason: payload.reason,
 }));
 this.listen(EVENTS.USER_BANNED, (payload) => ({
 action: payload.action || 'BAN', user: payload.targetId, moderator: payload.moderatorId, groupId: payload.groupId,
 reason: payload.reason, details: { expiresAt: payload.expiresAt },
 }));
 this.listen(EVENTS.USER_UNBANNED, (payload) => ({
 action: 'UNBAN', user: payload.targetId, moderator: payload.moderatorId, reason: payload.reason || 'Ban removed',
 }));
 this.listen(EVENTS.RULE_CHANGED, (payload) => ({
 action: `RULE_${payload.action}`, user: payload.ruleId, moderator: payload.moderator,
 reason: payload.field ? `${payload.field} updated` : `Rule ${payload.action}`, details: payload,
 }));
 this.listen(EVENTS.SETTINGS_CHANGED, (payload) => ({
 action: 'SETTINGS_CHANGED', user: payload.target || payload.key || 'global', moderator: payload.moderator || 'dashboard',
 reason: payload.reason || 'Settings updated', details: payload,
 }));
 this.listen(EVENTS.COMMAND_EXECUTED, (payload) => SETTINGS_COMMANDS.has(payload.command) ? ({
 action: 'SETTINGS_COMMAND', user: payload.groupId || 'global', moderator: payload.authorId,
 groupId: payload.groupId, reason: `${payload.command} command executed`,
 }) : null);
 return this;
 }

 listen(event, map) {
 const listener = (payload = {}) => {
 const record = map(payload);
 if (!record) return;
 Promise.resolve(this.repo.add({ timestamp: Date.now(), ...record }))
 .catch((err) => this.logger.error('Audit write failed', { event, error: err.message }));
 };
 this.eventBus.on(event, listener);
 this.listeners.push([event, listener]);
 }

 stop() {
 for (const [event, listener] of this.listeners) this.eventBus.off(event, listener);
 this.listeners = [];
 }
}

export default AuditService;
