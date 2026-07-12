import { EVENTS } from '../config/constants.js';
import { warningText, banText, kickText } from '../utils/formatter.js';

export class ModerationService {
 constructor({ config, logger, eventBus, warnings, bans, settings, client = null, health = null }) {
 this.config = config;
 this.logger = logger;
 this.eventBus = eventBus;
 this.warnings = warnings;
 this.bans = bans;
 this.settings = settings;
 this.health = health;
 this.client = client;
 }

 setClient(client) {
 this.client = client;
 }

 async resolveContact(userId) {
 try { return await this.client.getContactById(userId); } catch { return null; }
 }

 async sendWithMentions(chatId, text, mentionedIds = []) {
 try {
 const contacts = [];
 for (const id of mentionedIds) {
 const contact = await this.resolveContact(id);
 if (contact) contacts.push(contact);
 }
 return await this.client.sendMessage(chatId, text, { mentions: contacts });
 } catch (err) {
 this.logger.error('sendWithMentions failed', { chatId, error: err.message });
 return null;
 }
 }

 getEscalationStep(count, warnLimit = null) {
 const policy = this.settings.getWarningEscalation(
 warnLimit ?? this.config.warnLimit,
 this.config.banDuration,
 );
 if (!policy.enabled) return null;
 return policy.levels
 .filter((level) => count >= level.threshold)
 .sort((a, b) => b.threshold - a.threshold)[0] || null;
 }

 async issueWarning({
 groupId,
 targetId,
 reason,
 issuerId = 'auto',
 deleteMessage = null,
 templates = null,
 warnLimit = null,
 }) {
 if (deleteMessage && typeof deleteMessage.delete === 'function') {
 try {
 await deleteMessage.delete(true);
 await this.settings.incBlockedMessages();
 } catch (err) {
 this.logger.debug('Could not delete message', { targetId, error: err.message });
 }
 }

 const record = await this.warnings.add(groupId, targetId, reason);
 const limit = warnLimit ?? this.config.warnLimit;
 const step = this.getEscalationStep(record.count, warnLimit);
 const warnFn = templates?.warn ?? warningText;
 await this.sendWithMentions(groupId, warnFn({
 botName: this.config.botName,
 userId: targetId,
 count: record.count,
 limit,
 severity: step?.severity || 'normal',
 }), [targetId]);

 this.eventBus.emit(EVENTS.WARNING_ISSUED, {
 groupId,
 targetId,
 count: record.count,
 limit,
 reason,
 issuerId,
 severity: step?.severity || 'normal',
 escalation: step?.action || 'warn',
 });
 this.logger.warn('Warning issued', { groupId, targetId, count: record.count, reason });

 if (step?.action === 'tempban' || step?.action === 'ban') {
 const duration = step.action === 'tempban' ? step.durationMs : this.config.banDuration;
 await this.banUser(
 groupId,
 targetId,
 `Warning escalation (${record.count}): ${reason}`,
 templates ? { ban: templates.ban } : null,
 duration,
 { moderatorId: issuerId, action: step.action.toUpperCase() },
 );
 }
 return record;
 }

 async moderate(message, detection, groupId, authorId, warnLimit = null) {
  return this.issueWarning({
   groupId,
   targetId: authorId,
   reason: `Toxic message (${detection.category || 'unknown'})`,
   issuerId: 'auto',
   deleteMessage: message,
   warnLimit,
  });
 }

 async handleAbuse(message, groupId, authorId, kind) {
 const reason = kind === 'spam' ? 'Spam (message frequency)' : 'Flood (identical messages)';
 return this.issueWarning({ groupId, targetId: authorId, reason, issuerId: 'auto', deleteMessage: message });
 }

 async banUser(groupId, targetId, reason, templates = null, durationMs = null, meta = {}) {
 const duration = durationMs ?? this.config.banDuration;
 try {
 const chat = await this.client.getChatById(groupId);
 if (chat && typeof chat.removeParticipants === 'function') await chat.removeParticipants([targetId]);
 } catch (err) {
 this.logger.warn('Could not remove participant', { targetId, groupId, error: err.message });
 }

 const record = await this.bans.add(groupId, targetId, reason, duration);
 const banFn = templates?.ban ?? banText;
 await this.sendWithMentions(groupId, banFn({
 botName: this.config.botName,
 userId: targetId,
 durationMs: duration,
 reason,
 }), [targetId]);

 this.eventBus.emit(EVENTS.USER_BANNED, {
 groupId,
 targetId,
 reason,
 expiresAt: record.expiresAt,
 moderatorId: meta.moderatorId || 'auto',
 action: meta.action || 'BAN',
 });
 this.logger.warn('User banned', { groupId, targetId, reason, expiresAt: record.expiresAt });
 return record;
 }

 async kickUser(groupId, targetId, reason, templates = null, meta = {}) {
 try {
 const chat = await this.client.getChatById(groupId);
 if (chat && typeof chat.removeParticipants === 'function') await chat.removeParticipants([targetId]);
 } catch (err) {
 this.logger.warn('Could not remove participant (kick)', { targetId, groupId, error: err.message });
 }

 const kickFn = templates?.kick ?? kickText;
 await this.sendWithMentions(groupId, kickFn({ botName: this.config.botName, userId: targetId, reason }), [targetId]);
 this.eventBus.emit(EVENTS.USER_KICKED, {
 groupId,
 targetId,
 reason,
 moderatorId: meta.moderatorId || 'auto',
 });
 this.logger.warn('User kicked', { groupId, targetId, reason });
 }

 async unbanUser(targetId, moderatorId = 'auto') {
 const removed = await this.bans.removeByUser(targetId);
 this.eventBus.emit(EVENTS.USER_UNBANNED, { targetId, moderatorId });
 this.logger.info('User unbanned', { targetId, removed });
 return removed;
 }

 async clearWarnings(groupId, userId) {
 const changed = await this.warnings.reset(groupId, userId);
 this.logger.info('Warnings cleared', { groupId, userId, changed });
 return changed;
 }
}

export default ModerationService;
