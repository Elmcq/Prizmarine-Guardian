import { EVENTS } from '../config/constants.js';

const SETTINGS_COMMANDS = new Set([
 'settings', 'antinsfw', 'antiad', 'antiraid', 'antisticker',
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
 this.listen(EVENTS.WARNING_ISSUED, (p) => ({
 action: 'WARNING', user: p.targetId, moderator: p.issuerId, groupId: p.groupId,
 reason: p.reason, details: { count: p.count, severity: p.severity, escalation: p.escalation },
 }));
 this.listen(EVENTS.USER_KICKED, (p) => ({
 action: 'KICK', user: p.targetId, moderator: p.moderatorId, groupId: p.groupId, reason: p.reason,
 }));
 this.listen(EVENTS.USER_BANNED, (p) => ({
 action: p.action || 'BAN', user: p.targetId, moderator: p.moderatorId, groupId: p.groupId,
 reason: p.reason, details: { expiresAt: p.expiresAt },
 }));
 this.listen(EVENTS.USER_UNBANNED, (p) => ({
 action: 'UNBAN', user: p.targetId, moderator: p.moderatorId, reason: p.reason || 'Ban removed',
 }));
 this.listen(EVENTS.RULE_CHANGED, (p) => ({
 action: `RULE_${p.action}`, user: p.ruleId, moderator: p.moderator,
 reason: p.field ? `${p.field} updated` : `Rule ${p.action}`, details: p,
 }));
 this.listen(EVENTS.SETTINGS_CHANGED, (p) => ({
 action: 'SETTINGS_CHANGED', user: p.target || p.key || 'global', moderator: p.moderator || 'dashboard',
 reason: p.reason || 'Settings updated', details: p,
 }));
 this.listen(EVENTS.COMMAND_EXECUTED, (p) => SETTINGS_COMMANDS.has(p.command) ? ({
 action: 'SETTINGS_COMMAND', user: p.groupId || 'global', moderator: p.authorId,
 groupId: p.groupId, reason: `${p.command} command executed`,
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
