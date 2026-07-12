/**
 * @file readyHandler — reacts to the client becoming ready and captures
 * invite links for groups where the bot is an admin (so banned users can
 * be DM'd a rejoin link when their ban expires).
 */

import { EVENTS } from '../config/constants.js';

/**
 * Capture invite links for every group where the bot is an admin.
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('../database/repositories/SettingsRepository.js').SettingsRepository} settingsRepo
 */
async function captureInviteLinks(client, settingsRepo) {
  try {
    const chats = await client.getChats();
    const myId = client.info?.wid?._serialized;
    let captured = 0;
    for (const chat of chats) {
      if (!chat.isGroup) continue;
      const me = (chat.participants || []).find((p) => p.id?._serialized === myId);
      if (!me || (!me.isAdmin && !me.isSuperAdmin)) continue;
      try {
        const link = await chat.getInviteLink();
        if (link) {
          await settingsRepo.setInviteLink(chat.id._serialized, link);
          captured += 1;
        }
      } catch {
        // Not all admin groups expose an invite link; ignore.
      }
    }
    if (captured) {
      // eslint-disable-next-line no-console
      client.logger?.info?.(`Captured ${captured} invite link(s).`);
    }
  } catch (err) {
    // Non-fatal: invite-link capture is best-effort.
    client.logger?.warn?.(`captureInviteLinks failed: ${err.message}`);
  }
}

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {object} deps.repos
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 * @param {import('../config/env.js').config} deps.config
 */
export function registerReadyHandler({ client, repos, logger, eventBus, config }) {
  client.on('ready', async () => {
    logger.info(`${config.botName} is ready!`);
    eventBus.emit(EVENTS.CONNECTION, { state: 'ready' });
    await captureInviteLinks(client, repos.settings);
  });
}

export default registerReadyHandler;
