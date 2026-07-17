/**
 * @file stickerHandler — independent `message` listener for Anti Sticker Spam.
 *
 * Registered SEPARATELY from the toxic / nsfw / advertisement / raid handlers
 * so existing flows are never modified. Responsibilities:
 *   1. Skip if the module is disabled, the message isn't a sticker, the chat
 *      isn't a group, or the author is the bot itself.
 *   2. Ask StickerService to detect (it only detects; returns type).
 *   3. Route the outcome:
 *        - flood / duplicate -> +1 warning via ModerationService (shares the
 *          global warning store, so reaching `warnLimit` produces a ban).
 *        - coordinated        -> LOG ONLY (Anti Raid handles group-wide raids).
 *
 * Per-user tracking guarantees different users sending stickers are never
 * punished together; only an individual's own flood / duplicate counts.
 */

import { EVENTS } from '../config/constants.js';
import { isOnCooldown, markCooldown } from '../middleware/cooldownMiddleware.js';
import { stickerWarningText, stickerBanText } from '../utils/formatter.js';
import { getChatFromMessage } from '../utils/chatCache.js';

/** Whether a whatsapp-web.js message is a sticker. */
function isStickerMessage(message) {
  return message?.type === 'sticker' || Boolean(message?._data && message._data.type === 'sticker');
}

/** Best-effort content key for a sticker (file hash / media hash). */
function stickerKeyOf(message) {
  return message?.filehash || (message?._data && message._data.filehash) || null;
}

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {object} deps.repos
 * @param {object} deps.services
 * @param {import('../config/env.js').config} deps.config
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 * @param {import('../services/StickerService.js').StickerService} deps.stickerService
 */
export function registerStickerHandler({ client, repos, services, config, logger, eventBus, stickerService }) {
  const stickerRepo = repos.sticker;
  const moderation = services.moderation;

  client.on('message', async (message) => {
    try {
      if (message.fromMe) return;
      if (!isStickerMessage(message)) return;

      const chat = getChatFromMessage(message);
      if (!chat.isGroup) return;

      const groupId = chat.id._serialized;
      const authorId = message.author || message.from;
      const stickerKey = stickerKeyOf(message);
      const now = Date.now();

      const detection = stickerService.detect({ groupId, userId: authorId, stickerKey, now });
      if (!detection.detected) return;

      const { type } = detection;

      // Coordinated (many different users): LOG ONLY — Anti Raid handles raids.
      if (type === 'coordinated') {
        const cooldownKey = `stickercoord:${groupId}`;
        if (isOnCooldown(cooldownKey, 10_000)) return;
        markCooldown(cooldownKey, 10_000);
        await stickerRepo.addIncident({
          timestamp: now,
          group: groupId,
          user: authorId,
          type,
          stickerKey,
          action: 'log',
        });
        logger.warn('Coordinated sticker spam (log only)', { groupId, type, user: authorId });
        eventBus.emit(EVENTS.STICKER_EVENT, { groupId, type, user: authorId });
        return;
      }

      // flood / duplicate -> warning (shared ModerationService warning store).
      const cooldownKey = `sticker:${groupId}:${authorId}`;
      if (isOnCooldown(cooldownKey, 2000)) return;
      markCooldown(cooldownKey, 2000);

      const sCfg = stickerRepo.getSettings();
      const reasonText = type === 'duplicate' ? 'Duplicate sticker spam' : 'Sticker flood';
      const action = 'warn';

      await stickerRepo.addIncident({
        timestamp: now,
        group: groupId,
        user: authorId,
        type,
        stickerKey,
        action,
      });
      logger.warn('Sticker incident', { groupId, authorId, type, action });

      await moderation.issueWarning({
        groupId,
        targetId: authorId,
        reason: reasonText,
        issuerId: 'auto',
        deleteMessage: message,
        warnLimit: sCfg.warnLimit,
        templates: {
          warn: (v) =>
            stickerWarningText({
              botName: v.botName,
              userId: v.userId,
              count: v.count,
              limit: v.limit,
              type,
              reason: reasonText,
            }),
          ban: (v) => stickerBanText({ botName: v.botName, userId: v.userId, reason: reasonText }),
        },
      });

      eventBus.emit(EVENTS.WARNING_ISSUED, {
        source: 'sticker',
        groupId,
        targetId: authorId,
        type,
      });
    } catch (err) {
      logger.error('stickerHandler error', { error: err.message, stack: err.stack });
    }
  });
}

export default registerStickerHandler;
