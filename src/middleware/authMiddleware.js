/**
 * @file authMiddleware — privilege resolution.
 * Decides whether a message author is the owner, a group admin, or the bot
 * itself, and whether they may run admin-only commands.
 */

/**
 * Reduce a WhatsApp id to its bare phone-number digits, so ids that refer to
 * the same account compare equal regardless of suffix:
 *   "6281234@s.whatsapp.net", "6281234:12@s.whatsapp.net", "6281234@c.us"
 * all reduce to "6281234". Group ids ("…@g.us") reduce to themselves so they
 * never accidentally match a user id.
 * @param {string} id
 * @returns {string}
 */
function canonicalUserId(id) {
  if (!id || typeof id !== 'string') return '';
  // Group chats and broadcast lists must not collapse to a phone number.
  if (id.includes('@g.us') || id.includes('@broadcast')) return id;
  const at = id.indexOf('@');
  const base = at === -1 ? id : id.slice(0, at);
  // Strip the ":<device>" device suffix if present ("6281234:0" -> "6281234").
  const colon = base.indexOf(':');
  const digits = colon === -1 ? base : base.slice(0, colon);
  return digits.replace(/\D/g, '');
}

/**
 * Whether the author is the configured owner.
 * @param {string} authorId
 * @param {string} ownerId - normalised owner id (digits, @c.us or @s.whatsapp.net).
 * @returns {boolean}
 */
export function isOwner(authorId, ownerId) {
  return Boolean(authorId && ownerId && canonicalUserId(authorId) === canonicalUserId(ownerId));
}

/**
 * Whether an author is an admin of the given group chat.
 * @param {import('whatsapp-web.js').Client} client
 * @param {object} chat - whatsapp-web.js Chat (group).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function isGroupAdmin(client, chat, userId) {
  if (!chat || !chat.isGroup) return false;
  const participants = chat.participants || [];
  const target = canonicalUserId(userId);
  if (!target) return false;
  const participant = participants.find(
    (p) => canonicalUserId(p.id?._serialized || p.id) === target,
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
