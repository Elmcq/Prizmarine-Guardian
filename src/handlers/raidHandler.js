/**
 * @file raidHandler — event wiring for the Anti Raid module.
 *
 * Registers THREE independent listeners so the existing toxic / nsfw /
 * advertisement / spam flows are never modified:
 *   1. `group_join`   — tracks joins (mass-join detection).
 *   2. `message`      — tracks message volume + content (message-raid +
 *                       coordinated-spam detection).
 *   3. EventBus `warning:issued` — detects new members who immediately trip
 *                       another moderation detector (new-member-abuse).
 *
 * When any detector crosses its threshold (and auto-raid is on), the handler
 * enables Raid Mode, logs an incident, notifies admins, and — while Raid Mode
 * is active — increases sensitivity: recent joiners who abuse the group are
 * banned immediately, and coordinated-spam participants are removed.
 *
 * Punishment always goes through ModerationService (banUser / issueWarning),
 * reusing the shared remove-participant + ban-record + announce logic.
 */

import { EVENTS } from '../config/constants.js';
import { isOnCooldown, markCooldown } from '../middleware/cooldownMiddleware.js';
import { raidBanText, raidAlertText } from '../utils/formatter.js';
import { getCachedChat } from '../utils/chatCache.js';

/** Classify which moderation detector produced a warning (from its reason). */
function classifySource(reason) {
  const r = String(reason || '').toLowerCase();
  if (r.includes('toxic')) return 'toxic';
  if (r.includes('nsfw')) return 'nsfw';
  if (r.includes('commercial')) return 'advertisement';
  if (r.includes('spam')) return 'spam';
  if (r.includes('flood')) return 'flood';
  return null;
}

/** Defensively extract (groupId, recipientIds) from a group_join notification. */
function parseGroupJoin(notification) {
  const n = notification || {};
  const groupId =
    n.chat?.id?._serialized ||
    n.id?.remote ||
    (typeof n.from === 'string' ? n.from : null);
  const recipientIds = Array.isArray(n.recipientIds) ? n.recipientIds : [];
  return { groupId, recipientIds };
}

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {object} deps.repos
 * @param {object} deps.services
 * @param {import('../config/env.js').config} deps.config
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 * @param {import('../services/RaidService.js').RaidService} deps.raidService
 */
export function registerRaidHandler({ client, repos, services, config, logger, eventBus, raidService }) {
  const raidRepo = repos.raid;
  const moderation = services.moderation;

  /** Notify group admins (DM each; fall back to posting in the group). */
  async function notifyAdmins(groupId, text) {
    try {
      const chat = await client.getChatById(groupId);
      const admins = (chat.participants || []).filter((p) => p.isAdmin || p.isSuperAdmin);
      if (!admins.length) {
        await client.sendMessage(groupId, text);
        return;
      }
      for (const a of admins) {
        const id = a.id?._serialized || a.id;
        if (!id) continue;
        try {
          await client.sendMessage(id, text);
        } catch {
          /* skip unreachable admin */
        }
      }
    } catch (err) {
      logger.error('raid notifyAdmins failed', { error: err.message });
      try {
        await client.sendMessage(groupId, text);
      } catch {
        /* give up */
      }
    }
  }

  /** Remove coordinated-spam participants (clear raiders). */
  async function banCoordinated(groupId, users) {
    for (const uid of users || []) {
      const key = `raidban:${groupId}:${uid}`;
      if (!isOnCooldown(key, 60_000)) {
        markCooldown(key, 60_000);
        try {
          await moderation.banUser(groupId, uid, 'Coordinated raid spam', {
            ban: (v) =>
              raidBanText({
                botName: v.botName,
                userId: v.userId,
                reason: 'Coordinated raid spam',
              }),
          });
        } catch (err) {
          logger.error('raid coordinated ban failed', { error: err.message });
        }
      }
    }
  }

  /** Enable Raid Mode, log incidents, notify admins, ban coordinated raiders. */
  async function activateRaidMode(groupId, result) {
    const now = Date.now();
    await raidService.setRaidMode(groupId, true, now);
    for (const type of result.types) {
      await raidRepo.addIncident({
        timestamp: now,
        group: groupId,
        type,
        users: [...(result.coordinatedUsers || [])],
      });
    }
    logger.warn('Raid mode activated', { groupId, triggers: result.types });
    if (raidRepo.isNotifyAdmins()) {
      try {
        await notifyAdmins(
          groupId,
          raidAlertText({ botName: config.botName, groupId, triggers: result.types }),
        );
      } catch {
        /* notification is best-effort */
      }
    }
    await banCoordinated(groupId, result.coordinatedUsers);
  }

  /**
   * Evaluate thresholds and react. If Raid Mode is not yet active, auto-activate
   * it (logging + notifying + banning coordinated raiders). If it IS already
   * active, enforce heightened sensitivity: coordinated raiders are removed
   * immediately even though the mode is already on.
   */
  async function processRaid(groupId, now) {
    if (!raidRepo.isEnabled()) return;
    const result = raidService.evaluate(groupId, now);
    if (!result.types.length) return;

    if (raidService.isRaidMode(groupId, now)) {
      // Already in Raid Mode: keep enforcing heightened sensitivity.
      if (result.types.includes('coordinated')) {
        await banCoordinated(groupId, result.coordinatedUsers);
      }
      return;
    }
    if (raidRepo.isAutoRaidMode()) {
      await activateRaidMode(groupId, result);
    }
  }

  // 1) Joins ------------------------------------------------------------
  client.on('group_join', async (notification) => {
    try {
      const { groupId, recipientIds } = parseGroupJoin(notification);
      if (!groupId) return;
      const now = Date.now();
      for (const uid of recipientIds) raidService.trackJoin(groupId, uid, now);
      await processRaid(groupId, now);
    } catch (err) {
      logger.error('raidHandler group_join error', { error: err.message });
    }
  });

  // 2) Messages ---------------------------------------------------------
  client.on('message', async (message) => {
    try {
      if (message.fromMe) return;
      const chat = await getCachedChat(message);
      if (!chat.isGroup) return;
      const groupId = chat.id._serialized;
      const authorId = message.author || message.from;
      const body = (message.body || '').trim();
      if (!body) return;
      const now = Date.now();
      raidService.trackMessage(groupId, authorId, body, now);
      await processRaid(groupId, now);
    } catch (err) {
      logger.error('raidHandler message error', { error: err.message, stack: err.stack });
    }
  });

  // 3) New-member abuse (via other detectors' warnings) ----------------
  eventBus.on(EVENTS.WARNING_ISSUED, (e) => {
    // Skip the duplicate emissions that the nsfw/ad handlers add (they carry a
    // `source`). Process only the canonical ModerationService emission.
    if (e.source) return;
    const { groupId, targetId, reason } = e;
    if (!groupId || !targetId) return;
    const source = classifySource(reason);
    if (!source) return;
    const now = Date.now();
    if (!raidService.isRecentJoiner(groupId, targetId, now)) return;

    raidService.signalNewMemberAbuse(groupId, targetId, source, now);

    // Increased sensitivity: during Raid Mode a new member abusing the group
    // is banned immediately (no warning ladder).
    if (raidService.isRaidMode(groupId, now)) {
      const key = `raidban:${groupId}:${targetId}`;
      if (!isOnCooldown(key, 60_000)) {
        markCooldown(key, 60_000);
        moderation
          .banUser(groupId, targetId, `New member abuse during raid mode (${source})`, {
            ban: (v) =>
              raidBanText({
                botName: v.botName,
                userId: v.userId,
                reason: `New member abuse (${source}) during raid mode`,
              }),
          })
          .catch((err) => logger.error('raid new-member ban failed', { error: err.message }));
      }
    }
  });
}

export default registerRaidHandler;
