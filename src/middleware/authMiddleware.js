/**
 * @file authMiddleware — privilege resolution.
 * Decides whether a message author is the owner, a group admin, or the bot
 * itself, and whether they may run admin-only commands.
 */

/**
 * Whether the author is the configured owner.
 * @param {string} authorId
 * @param {string} ownerId - normalised owner id (includes @c.us).
 * @returns {boolean}
 */
export function isOwner(authorId, ownerId) {
  return Boolean(authorId && ownerId && authorId === ownerId);
}

/**
 * Whether the author is an admin of the given group chat.
 * @param {import('whatsapp-web.js').Client} client
 * @param {object} chat - whatsapp-web.js Chat (group).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function isGroupAdmin(client, chat, userId) {
  if (!chat || !chat.isGroup) return false;
  const participants = chat.participants || [];
  const participant = participants.find(
    (p) => (p.id?._serialized || p.id) === userId,
  );
  return Boolean(participant && (participant.isAdmin || participant.isSuperAdmin));
}

/**
 * Whether the author may run an admin-only command.
 * Owner always passes; otherwise must be a group admin.
 * @param {{ message: object, client: object, chat: object, authorId: string, config: object }} ctx
 * @returns {Promise<boolean>}
 */
export async function canRunAdminCommand({ client, chat, authorId, config }) {
  if (isOwner(authorId, config.owner)) return true;
  return isGroupAdmin(client, chat, authorId);
}

/**
 * Whether the bot itself (or a privileged user) should be excluded from
 * automatic moderation. Owner and group admins are never auto-warned/banned.
 * @param {{ message: object, client: object, chat: object, authorId: string, config: object }} ctx
 * @returns {Promise<boolean>} true if the author should be moderated.
 */
export async function shouldModerate({ message, client, chat, authorId, config }) {
  if (message.fromMe) return false;
  if (isOwner(authorId, config.owner)) return false;
  if (await isGroupAdmin(client, chat, authorId)) return false;
  return true;
}
