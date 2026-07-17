/**
 * Safely get chat from a message, using cache to avoid Puppeteer race conditions.
 * Multiple handlers (message, nsfw, ad, raid, sticker) all call getChat()
 * concurrently on the same message, causing Puppeteer execution context errors.
 * This helper caches the result on the message object so only one call is made.
 */
export async function getCachedChat(message) {
  if (message._cachedChat) return message._cachedChat;
  const chat = await message.getChat();
  message._cachedChat = chat;
  return chat;
}
