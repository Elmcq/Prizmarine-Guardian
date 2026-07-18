/**
 * @file BadwordRepository — reads/writes the AntiToxic module configuration
 * and incident log stored in data/badwords.json.
 * English profanity words are loaded from better-profane-words package.
 * Words are organized into 4 tiers: normal, sensitive, high, slurs.
 */

import * as betterProfane from 'better-profane-words';

const TIER_KEYS = ['normal', 'sensitive', 'high', 'slurs'];

const TIER_LEVELS = { normal: 0, sensitive: 1, high: 2, slurs: 3 };

// Map better-profane-words intensity (1-5) to severity (0-10)
const INTENSITY_TO_SEVERITY = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 };

// Map better-profane-words categories to our tiers
const PROFANE_TO_TIER = {
  bodily: 'high',
  drug: 'sensitive',
  hateful_ideology: 'slurs',
  insult: 'sensitive',
  religious: 'high',
  sexual: 'high',
  slur_gender: 'slurs',
  slur_racial: 'slurs',
  violence: 'high',
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
  const tiers = this.getAllTiers();
  const tierCounts = {};
  let totalWords = 0;
  for (const [tier, words] of Object.entries(tiers)) {
   tierCounts[tier] = words.length;
   totalWords += words.length;
  }
  const cfg = d.config || {};
  return {
   enabled: this.isEnabled(),
   warnLimit: d.warnLimit ?? 3,
   highSeverityBan: Boolean(d.highSeverityBan),
   toxicThreshold: cfg.toxicThreshold ?? 3,
   cooldownDurationMs: cfg.cooldownDurationMs ?? 15000,
   negationWindow: cfg.negationWindow ?? 3,
   targetRequired: Boolean(cfg.targetRequired),
   tiers: tierCounts,
   keywords: totalWords,
   patterns: (d.patterns || []).length,
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

 getAllTiers() {
  const d = this.db.data || {};
  const tiers = {};

  for (const tier of TIER_KEYS) {
   tiers[tier] = Array.isArray(d.tiers?.[tier])
    ? d.tiers[tier].filter(w => typeof w === 'string')
    : [];
  }

  // Merge better-profane-words into appropriate tiers
  const existingWords = new Set();
  for (const tier of TIER_KEYS) {
   for (const word of tiers[tier]) {
    existingWords.add(word.toLowerCase());
   }
  }

  const profaneWords = betterProfane.getAll();
  for (const entry of profaneWords) {
   const word = entry.word.toLowerCase().trim();
   if (!word || word.length < 2 || existingWords.has(word)) continue;

   const targetTier = PROFANE_TO_TIER[entry.categories[0]] || 'high';
   tiers[targetTier].push(word);
   existingWords.add(word);
  }

  return tiers;
 }

 getAll() {
  const d = this.db.data || {};
  const tiers = this.getAllTiers();

  // Build flat word list with tier info for backward compatibility
  const allWords = {};
  for (const [tier, words] of Object.entries(tiers)) {
   allWords[tier] = words;
  }

  // Keep legacy categories for backward compat
  allWords.patterns = Array.isArray(d.patterns) ? d.patterns : [];
  allWords.severity = d.severity || {};
  allWords.config = d.config || {};
  allWords.negations = d.negations || [];
  allWords.contextPatterns = d.contextPatterns || {};
  allWords.targetPronouns = d.targetPronouns || [];

  return allWords;
 }

 getTierForWord(word) {
  const d = this.db.data || {};
  const normalized = word.toLowerCase();
  for (const tier of TIER_KEYS) {
   const list = d.tiers?.[tier] || [];
   if (list.some(w => w.toLowerCase() === normalized)) {
    return tier;
   }
  }
  return 'sensitive'; // default tier
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
