const CACHE_TTL_MS = 60 * 60 * 1000;

export class ContactResolver {
 constructor(client, logger, settings = null) {
 this.client = client;
 this.logger = logger;
 this.settings = settings;
 this.cache = new Map();
 for (const [id, profile] of Object.entries(settings?.getContactProfiles?.() || {})) {
 if (profile?.name) this.cache.set(id, { name: profile.name, type: profile.type, ts: profile.updatedAt || 0 });
 }
 }

 setClient(client) {
 this.client = client;
 }

 async resolve(id) {
 if (!id) return '';
 if (!this._looksLikeWhatsAppId(id)) return String(id);
 const cached = this.cache.get(id);
 if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.name;
 const profile = await this._fetchProfile(id);
 await this.cacheProfile(id, profile.name, profile.type);
 return profile.name;
 }

 async resolveMany(ids) {
 const unique = [...new Set(ids.filter(Boolean))];
 const values = await Promise.all(unique.map((id) => this.resolve(id)));
 return new Map(unique.map((id, index) => [id, values[index]]));
 }

 async cacheProfile(id, name, type = 'contact') {
 const clean = String(name || '').trim();
 if (!id || !clean) return;
 const profile = { name: clean, type, ts: Date.now() };
 this.cache.set(id, profile);
 try {
 await this.settings?.setContactProfile?.(id, { name: clean, type, updatedAt: profile.ts });
 } catch (err) {
 this.logger?.debug?.('Could not persist contact profile', { id, error: err.message });
 }
 }

 cacheName(id, name, type = 'contact') {
 this.cacheProfile(id, name, type).catch(() => {});
 }

 async _fetchProfile(id) {
 if (!this.client) return { name: this.formatFallback(id), type: this._isGroup(id) ? 'group' : 'contact' };
 try {
 if (this._isGroup(id)) {
 const chat = await this.client.getChatById(id);
 return { name: chat?.name || this.formatFallback(id), type: 'group' };
 }
 const waId = id.includes('@') ? id : `${id}@c.us`;
 const contact = await this.client.getContactById(waId);
 return {
 name: contact?.pushname || contact?.name || contact?.shortName || this.formatFallback(contact?.number || id),
 type: 'contact',
 };
 } catch {
 const stored = this.settings?.getContactProfile?.(id);
 return { name: stored?.name || this.formatFallback(id), type: stored?.type || (this._isGroup(id) ? 'group' : 'contact') };
 }
 }

 formatFallback(id) {
 if (!id) return '';
 const raw = String(id).replace(/@.*$/, '').replace(/:\d+$/, '');
 if (this._isGroup(id)) return `Group ${raw.slice(-6)}`;
 if (!/^\d+$/.test(raw)) return raw;
 const local = raw.startsWith('62') ? `0${raw.slice(2)}` : raw;
 const groups = [];
 let cursor = 0;
 const sizes = local.length > 10 ? [4, 4] : [4, 3];
 for (const size of sizes) {
 if (cursor >= local.length) break;
 groups.push(local.slice(cursor, cursor + size));
 cursor += size;
 }
 if (cursor < local.length) groups.push(local.slice(cursor));
 return groups.join(' ');
 }

 _isGroup(id) {
 return String(id).includes('@g.us');
 }

 _looksLikeWhatsAppId(id) {
 const value = String(id);
 return value.includes('@') || /^\d{7,}$/.test(value);
 }
}

export default ContactResolver;
