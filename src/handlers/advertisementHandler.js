/**
 * @file advertisementHandler — independent `message` listener for Anti
 * Advertisement moderation.
 *
 * This handler is registered SEPARATELY from the toxic and NSFW message
 * handlers so existing flows are never modified. Responsibilities:
 *   1. Skip if the module is disabled, the chat isn't a group, or the author
 *      is the owner / an admin / the bot itself (reuses authMiddleware).
 *   2. Ask AdvertisementService to detect (it only detects; returns
 *      severity/category). Non-commercial contexts (Discord/Telegram/WhatsApp
 *      invites, YouTube/TikTok/GitHub, Minecraft servers, personal sites) are
 *      suppressed by the service itself.
 *   3. Escalate to HIGH severity when the user is a repeat offender (any
 *      prior warning) or is sending mass advertisement spam (many ad
 *      detections within a short window).
 *   4. Log the incident and let ModerationService decide the punishment:
 *        - low / medium  -> issueWarning (ban at the advertisement warn limit)
 *        - high          -> immediate ban (no 3-warning wait)
 *
 * All message templates are supplied by the caller so ModerationService's
 * shared punishment logic is reused without duplication.
 */

import { EVENTS } from '../config/constants.js';
import { shouldModerate } from '../middleware/authMiddleware.js';
import { isOnCooldown, markCooldown } from '../middleware/cooldownMiddleware.js';
import { adWarningText, adBanText } from '../utils/formatter.js';

/** Mass advertisement spam: this many ad detections from one user within the
 *  window escalates the user to HIGH severity (immediate ban). */
const AD_MASS_THRESHOLD = 3;
const AD_MASS_WINDOW_MS = 10_000;

/** In-memory per-user burst tracker for mass advertisement spam. */
const adStreaks = new Map();

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {object} deps.repos
 * @param {object} deps.services
 * @param {import('../config/env.js').config} deps.config
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 * @param {import('../services/AdvertisementService.js').AdvertisementService} deps.advertisementService
 */
export function registerAdvertisementHandler({
  client,
  repos,
  services,
  config,
  logger,
  eventBus,
  advertisementService,
}) {
  const adRepo = repos.advertisement;
  const moderation = services.moderation;

  client.on('message', async (message) => {
    try {
      if (!adRepo.isEnabled()) return;

      const chat = await message.getChat();
      if (!chat.isGroup) return;

      const groupId = chat.id._serialized;
      const authorId = message.author || message.from;
      const body = (message.body || '').trim();
      if (!body) return;

      // Exempt owner / admins / the bot itself.
      const moderate = await shouldModerate({ message, client, chat, authorId, config });
      if (!moderate) return;

      const detection = advertisementService.detect(body);
      if (!detection.detected) return;

      const { category, matched } = detection;
      let severity = detection.severity || 'low';

      // Mass advertisement spam: count this user's recent ad detections.
      const now = Date.now();
      const streakKey = `${groupId}:${authorId}`;
      const bucket = (adStreaks.get(streakKey) || []).filter((t) => now - t < AD_MASS_WINDOW_MS);
      bucket.push(now);
      adStreaks.set(streakKey, bucket);
      if (bucket.length >= AD_MASS_THRESHOLD) {
        severity = 'high';
      }

      // Escalate repeat offenders to high (immediate ban).
      const priorWarnings = repos.warnings.get(groupId, authorId)?.count || 0;
      if (severity !== 'high' && priorWarnings >= 1) {
        severity = 'high';
      }

      // Per-user cooldown so we don't spam the same offender.
      const cooldownKey = `ad:${groupId}:${authorId}`;
      if (isOnCooldown(cooldownKey, 2000)) return;
      markCooldown(cooldownKey, 2000);

      const adSettings = adRepo.getSettings();
      const willBan =
        (severity === 'high' && adSettings.highSeverityBan) ||
        priorWarnings + 1 >= adSettings.warnLimit;
      const action = willBan ? 'ban' : 'warn';
      const reasonText = `Commercial advertisement (${category}${severity === 'high' ? ' - high severity' : ''})`;

      // Log the incident (timestamp, group, user, category, severity, matched, action).
      await adRepo.addIncident({
        timestamp: Date.now(),
        group: groupId,
        user: authorId,
        category,
        severity,
        matched,
        action,
      });
      logger.warn('Advertisement incident', { groupId, authorId, category, severity, action, matched });

      if (severity === 'high') {
        await moderation.banUser(groupId, authorId, reasonText, {
          ban: (v) => adBanText({ botName: v.botName, userId: v.userId, reason: reasonText }),
        });
      } else {
        await moderation.issueWarning({
          groupId,
          targetId: authorId,
          reason: reasonText,
          issuerId: 'auto',
          deleteMessage: message,
          warnLimit: adSettings.warnLimit,
          templates: {
            warn: (v) =>
              adWarningText({
                botName: v.botName,
                userId: v.userId,
                count: v.count,
                limit: v.limit,
                category,
                severity,
                reason: 'Detected commercial advertisement.',
              }),
            ban: (v) => adBanText({ botName: v.botName, userId: v.userId, reason: reasonText }),
          },
        });
      }

      eventBus.emit(EVENTS.WARNING_ISSUED, { source: 'advertisement', groupId, authorId, category, severity });
    } catch (err) {
      logger.error('advertisementHandler error', { error: err.message, stack: err.stack });
    }
  });
}

export default registerAdvertisementHandler;
