/**
 * Safely get chat from a message, using a promise cache to prevent
 * Puppeteer race conditions. Multiple handlers (message, nsfw, ad, raid, sticker)
 * all fire concurrently on the same message event. Without a shared promise,
 * they all call getChat() simultaneously, crashing Puppeteer's execution context.
 */
const chatCache = new WeakMap();

export async function getCachedChat(message) {
  if (chatCache.has(message)) {
    return chatCache.get(message);
  }
  const promise = message.getChat();
  chatCache.set(message, promise);
  try {
    return await promise;
  } finally {
    chatCache.delete(message);
  }
}
