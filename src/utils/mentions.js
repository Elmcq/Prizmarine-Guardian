/**
 * @file Mention helpers for WhatsApp messages.
 * whatsapp-web.js renders a mention when you pass `mentions: [Contact]`
 * to sendMessage AND the body contains a matching `@token`. We standardise
 * on `@<number>` tokens (id without the `@c.us` suffix).
 */

/**
 * Extract mentioned participant ids from a message.
 * @param {object} message - whatsapp-web.js Message.
 * @returns {string[]} Array of WhatsApp ids (e.g. "628...@c.us").
 */
export function getMentionedIds(message) {
  if (!message) return [];
  const ids = message.mentionedIds || [];
  return Array.isArray(ids) ? ids : [];
}

/**
 * Build the textual mention token for an id ("628...@c.us" -> "@628...").
 * @param {string} userId
 * @returns {string}
 */
export function mentionToken(userId) {
  const number = String(userId).split('@')[0];
  return `@${number}`;
}

/**
 * Resolve a mention token string for use inside a message body.
 * Convenience wrapper around {@link mentionToken}.
 * @param {string} userId
 * @returns {string}
 */
export function mentionText(userId) {
  return mentionToken(userId);
}

/**
 * Build a human-readable "reason" string from command args, stripping out
 * any token that matches a mentioned participant's display name (so
 * `!warn @John spam` becomes reason "spam", not "John spam").
 * @param {string[]} args - Command arguments (after the command name).
 * @param {string[]} mentionedIds - Mentioned WhatsApp ids.
 * @param {import('whatsapp-web.js').Client} client
 * @returns {Promise<string>}
 */
export async function extractReason(args, mentionedIds, client) {
 const filtered = Array.isArray(args) ? [...args] : [];
 if (mentionedIds && mentionedIds.length) {
  const names = new Set();
  for (const id of mentionedIds) {
   const number = String(id).split('@')[0];
   names.add(number);
   try {
    const contact = await client.getContactById(id);
    if (contact?.name) names.add(contact.name.toLowerCase());
    if (contact?.pushname) names.add(contact.pushname.toLowerCase());
   } catch {
    /* ignore */
   }
  }
  for (let i = filtered.length - 1; i >= 0; i -= 1) {
   if (names.has(filtered[i].toLowerCase()) || names.has(filtered[i])) filtered.splice(i, 1);
  }
 }
 return filtered.join(' ').trim();
}
