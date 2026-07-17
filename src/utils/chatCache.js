/**
 * Safely get chat info from a message WITHOUT calling message.getChat().
 *
 * message.getChat() internally calls Client.getChatById() → page.evaluate(),
 * which crashes with "r: r" when WhatsApp's internal Store.Chat is broken.
 * Instead, we construct a minimal chat-like object from message metadata.
 */
export function getChatFromMessage(message) {
  const from = message?.from || '';
  const isGroup = from.endsWith('@g.us') || from.endsWith('@lid');
  return {
    id: { _serialized: from },
    isGroup,
    name: null,
    participants: [],
  };
}

/**
 * Safely try to get the real chat object for admin checks.
 * If getChatById fails (Puppeteer execution context broken), returns null.
 */
export async function getRealChatSafe(client, chatId) {
  try {
    return await client.getChatById(chatId);
  } catch {
    return null;
  }
}
