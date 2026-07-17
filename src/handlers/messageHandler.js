import { EVENTS } from '../config/constants.js';
import { UNAUTHORIZED_TEXT, cooldownText } from '../utils/formatter.js';
import { guardCommand } from '../middleware/rateLimitMiddleware.js';
import { shouldModerate, isGroupAdmin, isOwner } from '../middleware/authMiddleware.js';
import { isOnCooldown, markCooldown } from '../middleware/cooldownMiddleware.js';
import { getChatFromMessage } from '../utils/chatCache.js';

export function registerMessageHandler({ client, repos, services, config, logger, eventBus, rateLimiter, commandRegistry, contactResolver }) {
 client.on('message', async (message) => {
 try {
 const chat = getChatFromMessage(message);
 const isGroup = Boolean(chat.isGroup);
 const authorId = message.author || message.from;
 const groupId = isGroup ? chat.id._serialized : null;
 if (contactResolver) {
 try {
 const contact = await message.getContact();
 const contactId = contact?.id?._serialized || authorId;
 const contactName = contact?.pushname || contact?.name || contact?.shortName;
 if (contactId && contactName) await contactResolver.cacheProfile(contactId, contactName, 'contact');
 if (authorId && contactName && contactId !== authorId) await contactResolver.cacheProfile(authorId, contactName, 'contact');
 if (groupId && chat?.name) await contactResolver.cacheProfile(groupId, chat.name, 'group');
 } catch (err) {
 logger.debug('Contact profile capture failed', { authorId, error: err.message });
 }
 }
 await repos.settings.incMessagesSeen();
 const ownerCheck = isOwner(authorId, config.owner)
 || (config.ownerLid && authorId === config.ownerLid)
 || (config.ownerLid && isOwner(authorId, config.ownerLid));
 const isAdmin = isGroup ? await isGroupAdmin(client, chat, authorId) : false;
 const body = (message.body || '').trim();

 if (body.startsWith(config.prefix)) {
 const withoutPrefix = body.slice(config.prefix.length).trim();
 const spaceIdx = withoutPrefix.indexOf(' ');
 const cmdName = (spaceIdx === -1 ? withoutPrefix : withoutPrefix.slice(0, spaceIdx)).toLowerCase();
 const args = spaceIdx === -1 ? [] : withoutPrefix.slice(spaceIdx + 1).trim().split(/\s+/).filter(Boolean);
 const command = commandRegistry.get(cmdName);
 if (command) {
 const guard = guardCommand({ userId: authorId, command: cmdName, rateLimiter });
 if (!guard.allowed) {
 if (guard.reason === 'cooldown') await message.reply(cooldownText(guard.retryAfterSec || 3));
 else await message.reply(`🚫 Too many commands. Try again in ${guard.retryAfterSec || 1}s.`);
 return;
 }
 if (command.adminOnly && !(ownerCheck || isAdmin)) {
 await message.reply(UNAUTHORIZED_TEXT);
 return;
 }
 const ctx = { message, args, client, config, logger, eventBus, repos, services, rateLimiter, commandRegistry, chat, authorId, groupId, isAdmin, isOwner: ownerCheck, commandName: cmdName };
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

if (isGroup && !message.fromMe && services.toxicity.isEnabled()) {
 const detection = services.toxicity.detect(body, message, authorId);
 if (detection.isToxic) {
 logger.info('AntiToxic match', { enabled: true, sanitized: detection.sanitized, category: detection.category, keyword: detection.keyword, score: detection.score, decision: detection.decision, context: detection.context, target: detection.target, negation: detection.negation, groupId, authorId });
 const incident = await repos.badwords.addIncident({ group: groupId, user: authorId, category: detection.category, matched: detection.matched, keyword: detection.keyword, action: detection.decision.toLowerCase(), score: detection.score, context: detection.context, target: detection.target, negation: detection.negation });
 eventBus.emit(EVENTS.TOXICITY_DETECTED, { groupId, targetId: authorId, category: detection.category, keyword: detection.keyword, matched: detection.matched, incidentId: incident.id, score: detection.score, decision: detection.decision });
 if (detection.decision === 'WARNING' || detection.decision === 'MUTE' || detection.decision === 'BAN') {
  const badwordsSettings = repos.badwords.getSettings();
  await services.moderation.moderate(message, detection, groupId, authorId, badwordsSettings.warnLimit);
 }
 return;
 }
}

 if (isGroup) {
 const moderate = await shouldModerate({ message, client, chat, authorId, config });
 if (!moderate) return;
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
