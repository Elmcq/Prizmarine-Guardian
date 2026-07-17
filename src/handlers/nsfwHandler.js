/**
 * @file nsfwHandler — independent `message` listener for NSFW moderation.
 *
 * This handler is registered SEPARATELY from the toxic messageHandler so the
 * existing toxic flow is never modified. Responsibilities:
 *   1. Skip if the module is disabled, the chat isn't a group, or the author
 *      is the owner / an admin / the bot itself (reuses authMiddleware).
 *   2. Ask NSFWService to detect (it only detects; returns severity/category).
 *   3. Escalate repeat offenders (any prior warning + another hit = high).
 *   4. Log the incident and let ModerationService decide the punishment:
 *        - low / medium  -> issueWarning (ban at the NSFW warn limit)
 *        - high          -> immediate ban (no 3-warning wait)
 *
 * All message templates are supplied by the caller so ModerationService's
 * shared punishment logic is reused without duplication.
 */

import { EVENTS } from '../config/constants.js';
import { shouldModerate } from '../middleware/authMiddleware.js';
import { isOnCooldown, markCooldown } from '../middleware/cooldownMiddleware.js';
import { nsfwWarningText, nsfwBanText } from '../utils/formatter.js';

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {object} deps.repos
 * @param {object} deps.services
 * @param {import('../config/env.js').config} deps.config
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 * @param {import('../services/NSFWService.js').NSFWService} deps.nsfwService
 */
import { getCachedChat } from '../utils/chatCache.js';

export function registerNSFWHandler({ client, repos, services, config, logger, eventBus, nsfwService }) {
  const nsfwRepo = repos.nsfw;
  const moderation = services.moderation;

  client.on('message', async (message) => {
    try {
      if (!nsfwRepo.isEnabled()) return;

      const chat = await getCachedChat(message);
      if (!chat.isGroup) return;

      const groupId = chat.id._serialized;
      const authorId = message.author || message.from;
      const body = (message.body || '').trim();
      if (!body) return;

      // Exempt owner / admins / the bot itself.
      const moderate = await shouldModerate({ message, client, chat, authorId, config });
      if (!moderate) return;

      const detection = nsfwService.detect(body);
      if (!detection.detected) return;

      const { category, matched } = detection;
      let severity = detection.severity || 'low';

      // Escalate repeat offenders to high (immediate ban).
      const priorWarnings = repos.warnings.get(groupId, authorId)?.count || 0;
      if (severity !== 'high' && priorWarnings >= 1) {
        severity = 'high';
      }

      // Per-user cooldown so we don't spam the same offender.
      const cooldownKey = `nsfw:${groupId}:${authorId}`;
      if (isOnCooldown(cooldownKey, 2000)) return;
      markCooldown(cooldownKey, 2000);

      const nsfwSettings = nsfwRepo.getSettings();
      const willBan = severity === 'high' || priorWarnings + 1 >= nsfwSettings.warnLimit;
      const action = willBan ? 'ban' : 'warn';
      const reasonText = `NSFW content (${category}${severity === 'high' ? ' - high severity' : ''})`;

      // Log the incident (timestamp, group, user, category, severity, matched, action).
      await nsfwRepo.addIncident({
        timestamp: Date.now(),
        group: groupId,
        user: authorId,
        category,
        severity,
        matched,
        action,
      });
      logger.warn('NSFW incident', { groupId, authorId, category, severity, action, matched });

      if (severity === 'high') {
        await moderation.banUser(groupId, authorId, reasonText, {
          ban: (v) => nsfwBanText({ botName: v.botName, userId: v.userId, reason: reasonText }),
        });
      } else {
        await moderation.issueWarning({
          groupId,
          targetId: authorId,
          reason: reasonText,
          issuerId: 'auto',
          deleteMessage: message,
          warnLimit: nsfwSettings.warnLimit,
          templates: {
            warn: (v) =>
              nsfwWarningText({
                botName: v.botName,
                userId: v.userId,
                count: v.count,
                limit: v.limit,
                category,
                severity,
                reason: 'Detected prohibited adult content.',
              }),
            ban: (v) => nsfwBanText({ botName: v.botName, userId: v.userId, reason: reasonText }),
          },
        });
      }

      eventBus.emit(EVENTS.WARNING_ISSUED, { source: 'nsfw', groupId, authorId, category, severity });
    } catch (err) {
      logger.error('nsfwHandler error', { error: err.message, stack: err.stack });
    }
  });
}

export default registerNSFWHandler;
