/**
 * @file ModerationService — orchestrates warnings, bans and unbans.
 *
 * Design:
 *  - `issueWarning` is the single code path for every warning (auto-toxic,
 *    auto-spam/flood, and manual `!warn`). Reaching the limit triggers a ban.
 *  - Group-removal and message-deletion require admin rights; both are
 *    wrapped in try/catch so a missing permission degrades gracefully.
 *  - All side-effects emit domain events on the EventBus for central logging.
 */

import { EVENTS } from '../config/constants.js';
import { warningText, banText, kickText } from '../utils/formatter.js';
import { mentionToken } from '../utils/mentions.js';

export class ModerationService {
  /**
   * @param {object} deps
   * @param {import('../config/env.js').config} deps.config
   * @param {import('winston').Logger} deps.logger
   * @param {import('../events/EventBus.js').EventBus} deps.eventBus
   * @param {import('../database/repositories/WarningRepository.js').WarningRepository} deps.warnings
   * @param {import('../database/repositories/BanRepository.js').BanRepository} deps.bans
   * @param {import('whatsapp-web.js').Client} [deps.client]
   * @param {import('./HealthService.js').HealthService} [deps.health]
   */
  constructor({ config, logger, eventBus, warnings, bans, client = null, health = null }) {
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    this.warnings = warnings;
    this.bans = bans;
    this.health = health;
    /** @type {import('whatsapp-web.js').Client|null} */
    this.client = client;
  }

  /** Inject the WhatsApp client (available after construction in index.js). */
  setClient(client) {
    this.client = client;
  }

  /**
   * Resolve a WhatsApp id to a Contact for mention rendering.
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async resolveContact(userId) {
    try {
      return await this.client.getContactById(userId);
    } catch {
      return null;
    }
  }

  /**
   * Send a message to a chat, attaching mention Contact objects.
   * @param {string} chatId
   * @param {string} text
   * @param {string[]} mentionedIds
   * @returns {Promise<object|null>}
   */
  async sendWithMentions(chatId, text, mentionedIds = []) {
    try {
      const contacts = [];
      for (const id of mentionedIds) {
        const c = await this.resolveContact(id);
        if (c) contacts.push(c);
      }
      return await this.client.sendMessage(chatId, text, { mentions: contacts });
    } catch (err) {
      this.logger.error('sendWithMentions failed', { chatId, error: err.message });
      return null;
    }
  }

  /**
   * Core warning path used by every offence type.
   * @param {object} p
   * @param {string} p.groupId
   * @param {string} p.targetId
   * @param {string} p.reason
   * @param {string} [p.issuerId='auto']
   * @param {object} [p.deleteMessage] - Optional offending message to delete.
   * @param {{ warn?: Function, ban?: Function }} [p.templates] - Optional message
   *   template overrides (e.g. NSFW). Each receives the default vars and must
   *   return a string. Backward compatible: omit to use the toxic templates.
   * @param {number} [p.warnLimit] - Optional override of the ban-at-limit
   *   threshold (e.g. the NSFW module's own limit). Defaults to config.
   * @returns {Promise<object>} The updated warning record.
   */
  async issueWarning({
    groupId,
    targetId,
    reason,
    issuerId = 'auto',
    deleteMessage = null,
    templates = null,
    warnLimit = null,
  }) {
    // Best-effort: delete the offending message (needs admin rights).
    if (deleteMessage && typeof deleteMessage.delete === 'function') {
      try {
        await deleteMessage.delete(true);
      } catch (err) {
        this.logger.debug('Could not delete message', { targetId, error: err.message });
      }
    }

    const record = await this.warnings.add(groupId, targetId, reason);
    const limit = warnLimit ?? this.config.warnLimit;

    const warnFn = templates?.warn ?? warningText;
    const banFn = templates?.ban ?? banText;
    const text = warnFn({
      botName: this.config.botName,
      userId: targetId,
      count: record.count,
      limit,
    });
    await this.sendWithMentions(groupId, text, [targetId]);

    this.eventBus.emit(EVENTS.WARNING_ISSUED, {
      groupId,
      targetId,
      count: record.count,
      limit,
      reason,
      issuerId,
    });
    this.logger.warn('Warning issued', {
      groupId,
      targetId,
      count: record.count,
      reason,
    });

    if (record.count >= limit) {
      await this.banUser(
        groupId,
        targetId,
        `Reached warning limit (${record.count}/${limit})`,
        templates ? { ban: templates.ban } : null,
      );
    }
    return record;
  }

  /**
   * Handle an automatically detected toxic message.
   * @param {object} message - whatsapp-web.js Message.
   * @param {object} detection - result of ToxicityService.detect().
   * @param {string} groupId
   * @param {string} authorId
   */
  async moderate(message, detection, groupId, authorId) {
    const reason = `Toxic message (${detection.category || 'unknown'})`;
    return this.issueWarning({
      groupId,
      targetId: authorId,
      reason,
      issuerId: 'auto',
      deleteMessage: message,
    });
  }

  /**
   * Handle auto-detected spam or flood.
   * @param {object} message
   * @param {string} groupId
   * @param {string} authorId
   * @param {'spam'|'flood'} kind
   */
  async handleAbuse(message, groupId, authorId, kind) {
    const reason = kind === 'spam' ? 'Spam (message frequency)' : 'Flood (identical messages)';
    return this.issueWarning({
      groupId,
      targetId: authorId,
      reason,
      issuerId: 'auto',
      deleteMessage: message,
    });
  }

  /**
   * Ban a user: remove from group + persist ban record + announce.
   * @param {string} groupId
   * @param {string} targetId
   * @param {string} reason
   * @param {{ ban?: Function }} [templates] - Optional message template
   *   override (e.g. NSFW). Receives `{ botName, userId, durationMs }`.
   * @param {number} [durationMs] - Optional ban duration override (ms).
   *   Defaults to `config.banDuration`. Used by `!tempban`.
   * @returns {Promise<object>}
   */
  async banUser(groupId, targetId, reason, templates = null, durationMs = null) {
    const duration = durationMs ?? this.config.banDuration;

    // Best-effort: remove the participant (needs admin rights).
    try {
      const chat = await this.client.getChatById(groupId);
      if (chat && typeof chat.removeParticipants === 'function') {
        await chat.removeParticipants([targetId]);
      }
    } catch (err) {
      this.logger.warn('Could not remove participant', { targetId, groupId, error: err.message });
    }

    const record = await this.bans.add(groupId, targetId, reason, duration);

    const banFn = templates?.ban ?? banText;
    const text = banFn({
      botName: this.config.botName,
      userId: targetId,
      durationMs: duration,
    });
    await this.sendWithMentions(groupId, text, [targetId]);

    this.eventBus.emit(EVENTS.USER_BANNED, {
      groupId,
      targetId,
      reason,
      expiresAt: record.expiresAt,
    });
    this.logger.warn('User banned', { groupId, targetId, reason, expiresAt: record.expiresAt });
    return record;
  }

  /**
   * Kick a user: remove them from the group without creating a persistent ban
   * record (they may rejoin on their own). Announces via an optional template.
   * @param {string} groupId
   * @param {string} targetId
   * @param {string} reason
   * @param {{ kick?: Function }} [templates] - Optional message template
   *   override (e.g. rule-based). Receives `{ botName, userId, reason }`.
   * @returns {Promise<void>}
   */
  async kickUser(groupId, targetId, reason, templates = null) {
    try {
      const chat = await this.client.getChatById(groupId);
      if (chat && typeof chat.removeParticipants === 'function') {
        await chat.removeParticipants([targetId]);
      }
    } catch (err) {
      this.logger.warn('Could not remove participant (kick)', {
        targetId,
        groupId,
        error: err.message,
      });
    }

    const kickFn = templates?.kick ?? kickText;
    const text = kickFn({
      botName: this.config.botName,
      userId: targetId,
      reason,
    });
    await this.sendWithMentions(groupId, text, [targetId]);

    this.eventBus.emit(EVENTS.USER_KICKED, { groupId, targetId, reason });
    this.logger.warn('User kicked', { groupId, targetId, reason });
  }

  /**
   * Unban a user (clears the ban record; does not re-add them).
   * @param {string} targetId
   */
  async unbanUser(targetId) {
    const removed = await this.bans.removeByUser(targetId);
    this.eventBus.emit(EVENTS.USER_UNBANNED, { targetId });
    this.logger.info('User unbanned', { targetId, removed });
    return removed;
  }

  /**
   * Reset a user's warnings to zero.
   * @param {string} groupId
   * @param {string} userId
   */
  async clearWarnings(groupId, userId) {
    const changed = await this.warnings.reset(groupId, userId);
    this.logger.info('Warnings cleared', { groupId, userId, changed });
    return changed;
  }
}

export default ModerationService;
