/**
 * @file BadwordRepository — reads/writes the AntiToxic module configuration
 * and incident log stored in data/badwords.json (managed by DatabaseService).
 * English profanity words are loaded from better-profane-words package.
 */

import * as betterProfane from 'better-profane-words';

const CATEGORY_KEYS = ['indonesian', 'english', 'slurs', 'hateSpeech', 'harassment', 'spamInsults'];

// Map better-profane-words intensity (1-5) to our severity (0-10)
const INTENSITY_TO_SEVERITY = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 };

// Map better-profane-words categories to our categories
const CATEGORY_MAP = {
  bodily: 'english',
  drug: 'english',
  hateful_ideology: 'slurs',
  insult: 'english',
  religious: 'hateSpeech',
  sexual: 'english',
  slur_gender: 'slurs',
  slur_racial: 'slurs',
  violence: 'hateSpeech',
};

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
    .filter(([name]) => !['patterns', 'severity', 'config', 'negations', 'contextPatterns', 'targetPronouns'].includes(name))
    .map(([name, entries]) => [name, entries.length]),
  );
  const cfg = categories.config || {};
  return {
   enabled: this.isEnabled(),
   warnLimit: d.warnLimit ?? 3,
   highSeverityBan: Boolean(d.highSeverityBan),
   toxicThreshold: cfg.toxicThreshold ?? 3,
   cooldownDurationMs: cfg.cooldownDurationMs ?? 15000,
   negationWindow: cfg.negationWindow ?? 3,
   targetRequired: Boolean(cfg.targetRequired),
   categories: categoryCounts,
   keywords: Object.values(categoryCounts).reduce((total, count) => total + count, 0),
   patterns: categories.patterns?.length || 0,
   contextualConfig: cfg,
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
 
 // Handle contextual moderation configuration
 if (!d.config) d.config = {};
 if (partial.toxicThreshold !== undefined) {
  const n = Number(partial.toxicThreshold);
  if (Number.isFinite(n) && n >= 1) d.config.toxicThreshold = Math.floor(n);
 }
 if (partial.cooldownDurationMs !== undefined) {
  const n = Number(partial.cooldownDurationMs);
  if (Number.isFinite(n) && n >= 1000) d.config.cooldownDurationMs = Math.floor(n);
 }
 if (partial.negationWindow !== undefined) {
  const n = Number(partial.negationWindow);
  if (Number.isFinite(n) && n >= 1) d.config.negationWindow = Math.floor(n);
 }
 if (partial.targetRequired !== undefined) {
  d.config.targetRequired = Boolean(partial.targetRequired);
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
  
  // Include contextual moderation configuration
  categories.severity = d.severity || {};
  categories.config = d.config || {};
  categories.negations = d.negations || [];
  categories.contextPatterns = d.contextPatterns || {};
  categories.targetPronouns = d.targetPronouns || [];
  
  // Merge better-profane-words into english/slurs/hateSpeech
  const profaneWords = betterProfane.getAll();
  const existingEnglish = new Set(categories.english.map(w => w.toLowerCase()));
  const existingSlurs = new Set(categories.slurs.map(w => w.toLowerCase()));
  const existingHate = new Set(categories.hateSpeech.map(w => w.toLowerCase()));
  
  for (const entry of profaneWords) {
    const word = entry.word.toLowerCase().trim();
    if (!word || word.length < 2) continue;
    
    const severity = INTENSITY_TO_SEVERITY[entry.intensity] ?? 3;
    const targetCategory = CATEGORY_MAP[entry.categories[0]] || 'english';
    
    if (targetCategory === 'english' && !existingEnglish.has(word)) {
      categories.english.push(word);
      categories.severity[word] = severity;
      existingEnglish.add(word);
    } else if (targetCategory === 'slurs' && !existingSlurs.has(word)) {
      categories.slurs.push(word);
      categories.severity[word] = severity;
      existingSlurs.add(word);
    } else if (targetCategory === 'hateSpeech' && !existingHate.has(word)) {
      categories.hateSpeech.push(word);
      categories.severity[word] = severity;
      existingHate.add(word);
    }
  }
  
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
