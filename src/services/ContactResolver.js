/**
 * @file ContactResolver — caches WhatsApp contact names so the dashboard
 * can display human-readable names instead of raw phone-number IDs.
 *
 * The cache is populated passively (from incoming messages) and on-demand
 * (when the dashboard requests a resolve). Stale entries are re-fetched
 * periodically.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class ContactResolver {
 /**
  * @param {import('whatsapp-web.js').Client} client
  * @param {import('winston').Logger} logger
  */
 constructor(client, logger) {
  /** @type {import('whatsapp-web.js').Client|null} */
  this.client = client;
  this.logger = logger;
  /** @type {Map<string, { name: string, ts: number }>} */
  this.cache = new Map();
 }

 /** Inject the WhatsApp client (available after construction). */
 setClient(client) {
  this.client = client;
 }

 /**
  * Resolve a single WhatsApp ID to a display name.
  * Returns the cached name if fresh, otherwise fetches from WhatsApp.
  * @param {string} id
  * @returns {Promise<string>}
  */
 async resolve(id) {
  if (!id) return '';
  const cached = this.cache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.name;

  const name = await this._fetchName(id);
  this.cache.set(id, { name, ts: Date.now() });
  return name;
 }

 /**
  * Resolve multiple IDs in parallel.
  * @param {string[]} ids
  * @returns {Promise<Map<string, string>>} id -> name
  */
 async resolveMany(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const results = new Map();
  await Promise.all(
   unique.map(async (id) => {
    results.set(id, await this.resolve(id));
   }),
  );
  return results;
 }

 /**
  * Cache a name passively (e.g. from an incoming message).
  * @param {string} id
  * @param {string} name
  */
 cacheName(id, name) {
  if (id && name) this.cache.set(id, { name, ts: Date.now() });
 }

 /** @private */
 async _fetchName(id) {
  if (!this.client) return this._idToDisplay(id);
  try {
   const waId = id.includes('@') ? id : `${id}@c.us`;
   const contact = await this.client.getContactById(waId);
   const name = contact.pushname || contact.name || contact.number || this._idToDisplay(id);
   return name;
  } catch {
   return this._idToDisplay(id);
  }
 }

 /** Fallback: turn a raw ID into a short display string. */
 _idToDisplay(id) {
  if (!id) return '';
  const num = id.replace(/@.*$/, '');
  return num.length > 8 ? `${num.slice(0, 4)}…${num.slice(-4)}` : num;
 }
}

export default ContactResolver;
