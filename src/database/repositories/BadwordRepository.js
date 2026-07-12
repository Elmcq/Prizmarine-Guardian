const META_KEYS = new Set(['enabled', 'incidents']);

export class BadwordRepository {
 constructor(dbService) {
 this.dbService = dbService;
 this.db = dbService.badwords;
 }

 isEnabled() {
 return this.db.data.enabled !== false;
 }

 async setEnabled(value) {
 this.db.data.enabled = Boolean(value);
 await this.dbService.persist(this.db);
 }

 getSettings() {
 const categories = this.getAll();
 return {
 enabled: this.isEnabled(),
 categories: Object.fromEntries(
 Object.entries(categories)
 .filter(([name]) => name !== 'patterns')
 .map(([name, entries]) => [name, entries.length]),
 ),
 keywords: Object.entries(categories)
 .filter(([name]) => name !== 'patterns')
 .reduce((total, [, entries]) => total + entries.length, 0),
 patterns: categories.patterns?.length || 0,
 };
 }

 async updateSettings() {
 await this.dbService.persist(this.db);
 return this.getSettings();
 }

 async reload() {
 await this.dbService.badwords.read();
 return this.getSettings();
 }

 getAll() {
 const data = this.db.data;
 if (!data || typeof data !== 'object' || Array.isArray(data)) return { patterns: [] };
 const categories = {};
 for (const [name, entries] of Object.entries(data)) {
 if (META_KEYS.has(name) || !Array.isArray(entries)) continue;
 categories[name] = entries.filter((entry) => typeof entry === 'string' && entry.trim());
 }
 if (!categories.patterns) categories.patterns = [];
 return categories;
 }

 async addIncident(incident) {
 if (!Array.isArray(this.db.data.incidents)) this.db.data.incidents = [];
 const record = { id: this.dbService.uuid(), timestamp: Date.now(), ...incident };
 this.db.data.incidents.unshift(record);
 if (this.db.data.incidents.length > 1000) this.db.data.incidents.length = 1000;
 await this.dbService.persist(this.db);
 return record;
 }

 getIncidents() {
 return this.db.data.incidents || [];
 }

 getStats() {
 const incidents = this.getIncidents();
 const byCategory = {};
 for (const incident of incidents) {
 const category = incident.category || 'unknown';
 byCategory[category] = (byCategory[category] || 0) + 1;
 }
 const mostTriggeredCategory = Object.entries(byCategory)
 .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
 return {
 detections: incidents.length,
 warnings: incidents.filter((incident) => incident.action === 'warn').length,
 mostTriggeredCategory,
 keywords: this.getSettings().keywords,
 };
 }
}

export default BadwordRepository;
