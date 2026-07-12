const META_KEYS = new Set(['enabled', 'incidents', 'records']);
const WRAPPER_KEYS = ['badwords', 'categories', 'words', 'data'];

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
 const categoryCounts = Object.fromEntries(
 Object.entries(categories)
 .filter(([name]) => name !== 'patterns')
 .map(([name, entries]) => [name, entries.length]),
 );
 return {
 enabled: this.isEnabled(),
 categories: categoryCounts,
 keywords: Object.values(categoryCounts).reduce((total, count) => total + count, 0),
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
 const root = this.db.data;
 if (!root || typeof root !== 'object' || Array.isArray(root)) return { patterns: [] };

 const sources = [];
 const visited = new Set();
 const collectSource = (value, depth = 0) => {
 if (!value || typeof value !== 'object' || Array.isArray(value) || visited.has(value) || depth > 3) return;
 visited.add(value);
 sources.push(value);
 for (const key of WRAPPER_KEYS) collectSource(value[key], depth + 1);
 };
 collectSource(root);

 const categories = {};
 for (const source of sources) {
 for (const [name, entries] of Object.entries(source)) {
 if (META_KEYS.has(name) || WRAPPER_KEYS.includes(name) || !Array.isArray(entries)) continue;
 if (!categories[name]) categories[name] = [];
 for (const entry of entries) {
 if (typeof entry !== 'string') continue;
 const clean = entry.trim();
 if (clean && !categories[name].includes(clean)) categories[name].push(clean);
 }
 }
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
