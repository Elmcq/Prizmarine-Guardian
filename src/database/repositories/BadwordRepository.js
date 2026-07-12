/**
 * @file BadwordRepository — reads/writes the AntiToxic module configuration
 * and incident log stored in data/badwords.json (managed by DatabaseService).
 */

const CATEGORY_KEYS = ['indonesian', 'english', 'slurs', 'hateSpeech', 'harassment', 'spamInsults'];

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
  const d = this.db.data || {};
  const categories = this.getAll();
  const categoryCounts = Object.fromEntries(
   Object.entries(categories)
    .filter(([name]) => name !== 'patterns')
    .map(([name, entries]) => [name, entries.length]),
  );
  return {
   enabled: this.isEnabled(),
   warnLimit: d.warnLimit ?? 3,
   highSeverityBan: Boolean(d.highSeverityBan),
   categories: categoryCounts,
   keywords: Object.values(categoryCounts).reduce((total, count) => total + count, 0),
   patterns: categories.patterns?.length || 0,
  };
 }

 async updateSettings(partial = {}) {
  const d = this.db.data;
  if (partial.warnLimit !== undefined) {
   const n = Number(partial.warnLimit);
   if (Number.isFinite(n) && n >= 1) d.warnLimit = Math.floor(n);
  }
  if (partial.highSeverityBan !== undefined) {
   d.highSeverityBan = Boolean(partial.highSeverityBan);
  }
  await this.dbService.persist(this.db);
  return this.getSettings();
 }

 async reload() {
  await this.dbService.badwords.read();
  return this.getSettings();
 }

 getAll() {
  const d = this.db.data || {};
  const categories = {};
  for (const key of CATEGORY_KEYS) {
   categories[key] = Array.isArray(d[key]) ? d[key].filter((w) => typeof w === 'string') : [];
  }
  categories.patterns = Array.isArray(d.patterns) ? d.patterns : [];
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
