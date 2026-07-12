/**
 * @file messageHandler — the central inbound-message processor.
 *
 * Flow per message:
 *  1. Resolve chat + author identity, increment the seen counter.
 *  2. If the body starts with the command prefix, route to a command
 *     (applying rate-limit, cooldown and admin checks).
 *  3. Otherwise, in groups, run automatic moderation:
 *       - toxicity detection  -> warning
 *       - anti-spam / anti-flood -> warning
 * Owner, group admins and the bot itself are exempt from automatic
 * moderation (see authMiddleware.shouldModerate).
 */

import { EVENTS } from '../config/constants.js';
import { UNAUTHORIZED_TEXT, cooldownText } from '../utils/formatter.js';
import { guardCommand } from '../middleware/rateLimitMiddleware.js';
import { shouldModerate, isGroupAdmin, isOwner } from '../middleware/authMiddleware.js';
import { isOnCooldown, markCooldown } from '../middleware/cooldownMiddleware.js';

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {object} deps.repos
 * @param {object} deps.services
 * @param {import('../config/env.js').config} deps.config
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 * @param {import('../services/RateLimiter.js').RateLimiter} deps.rateLimiter
 * @param {Map<string, object>} deps.commandRegistry
 */
export function registerMessageHandler({
  client,
  repos,
  services,
  config,
  logger,
  eventBus,
  rateLimiter,
  commandRegistry,
}) {
  client.on('message', async (message) => {
    try {
      const chat = await message.getChat();
      const isGroup = Boolean(chat.isGroup);
      const authorId = message.author || message.from;
      const groupId = isGroup ? chat.id._serialized : null;

      await repos.settings.incMessagesSeen();

      const ownerCheck = isOwner(authorId, config.owner);
      const isAdmin = isGroup ? await isGroupAdmin(client, chat, authorId) : false;

      logger.info('Auth debug', { authorId, ownerConfig: config.owner, ownerCheck, isAdmin, isGroup });

      const body = (message.body || '').trim();

      // ---- 1) Command routing ----
      if (body.startsWith(config.prefix)) {
        const withoutPrefix = body.slice(config.prefix.length).trim();
        const spaceIdx = withoutPrefix.indexOf(' ');
        const cmdName = (
          spaceIdx === -1 ? withoutPrefix : withoutPrefix.slice(0, spaceIdx)
        ).toLowerCase();
        const args =
          spaceIdx === -1
            ? []
            : withoutPrefix
                .slice(spaceIdx + 1)
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        const command = commandRegistry.get(cmdName);
        if (command) {
          const guard = guardCommand({ userId: authorId, command: cmdName, rateLimiter });
          if (!guard.allowed) {
            if (guard.reason === 'cooldown') {
              await message.reply(cooldownText(guard.retryAfterSec || 3));
            } else {
              await message.reply(
                `🚫 Too many commands. Try again in ${guard.retryAfterSec || 1}s.`,
              );
            }
            return;
          }

          if (command.adminOnly && !(ownerCheck || isAdmin)) {
            await message.reply(UNAUTHORIZED_TEXT);
            return;
          }

          const ctx = {
            message,
            args,
            client,
            config,
            logger,
            eventBus,
            repos,
            services,
            rateLimiter,
            commandRegistry,
            chat,
            authorId,
            groupId,
            isAdmin,
            isOwner: ownerCheck,
            commandName: cmdName,
          };

          try {
            await command.run(ctx);
            eventBus.emit(EVENTS.COMMAND_EXECUTED, { command: cmdName, authorId, groupId });
            logger.info('Command executed', { command: cmdName, authorId });
          } catch (err) {
            logger.error('Command failed', { command: cmdName, error: err.message });
            await message.reply('⚠️ An error occurred while running that command.');
          }
          return;
        }
      }

      // ---- 2) Automatic moderation (groups only, not privileged) ----
      if (isGroup) {
        const moderate = await shouldModerate({ message, client, chat, authorId, config });
        if (!moderate) return;

        const detection = services.toxicity.detect(body);
        if (detection.isToxic) {
          await services.moderation.moderate(message, detection, groupId, authorId);
          return;
        }

        const abuse = services.spam.check(groupId, authorId, body);
        if (abuse) {
          const cooldownKey = `abuse:${groupId}:${authorId}`;
          if (!isOnCooldown(cooldownKey, 1500)) {
            markCooldown(cooldownKey, 1500);
            await services.moderation.handleAbuse(message, groupId, authorId, abuse);
          }
        }
      }
    } catch (err) {
      logger.error('messageHandler error', { error: err.message, stack: err.stack });
    }
  });
}

export default registerMessageHandler;
