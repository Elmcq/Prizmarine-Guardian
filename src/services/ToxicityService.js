import { sanitize, escapeRegex } from '../utils/sanitize.js';
import { ContextualModerationPipeline } from './ContextualModerationPipeline.js';

/**
 * ToxicityService - Wrapper for backward compatibility
 *
 * Uses ContextualModerationPipeline for detection with 4-tier system:
 * - normal: Never trigger
 * - sensitive: Full contextual pipeline
 * - high: High confidence profanity
 * - slurs: Hate speech
 */
export class ToxicityService {
 constructor(badwordRepo, logger = null) {
  this.repo = badwordRepo;
  this.logger = logger;
  this.pipeline = new ContextualModerationPipeline(badwordRepo, logger);
  this.words = [];
  this.patterns = [];
  this.reload();
 }

 isEnabled() {
  return this.repo.isEnabled();
 }

 reload() {
  const stats = this.pipeline.reload();
  const data = this.repo.getAll();
  const seen = new Set();
  this.words = [];

  // Load words with tier info
  const tierKeys = ['normal', 'sensitive', 'high', 'slurs'];
  for (const tier of tierKeys) {
   const entries = data[tier] || [];
   for (const raw of entries) {
    const normalized = sanitize(raw);
    if (!normalized) continue;
    const key = `${tier}:${normalized}`;
    if (seen.has(key)) continue;
    seen.add(key);
    this.words.push({
     tier,
     raw,
     regex: new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized)}(?=[^a-z0-9]|$)`, 'i'),
    });
   }
  }

  this.patterns = [];
  for (const source of data.patterns || []) {
   if (typeof source !== 'string' || !source.trim()) continue;
   try {
    this.patterns.push({ source, regex: new RegExp(source, 'i') });
   } catch {
    // Skip invalid patterns
   }
  }
  return stats;
 }

 getStats() {
  return this.repo.getStats();
 }

 detect(text, message = {}, authorId = '') {
  if (typeof text !== 'string' || !text) {
   return { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' };
  }
  const sanitized = sanitize(text);
  if (!sanitized) {
   return { isToxic: false, matched: [], category: null, keyword: null, sanitized };
  }
  const result = this.pipeline.detect(text, message, authorId);
  return {
   isToxic: result.isToxic,
   matched: result.matched,
   category: result.category,
   keyword: result.keyword,
   sanitized: result.sanitized,
   score: result.score,
   decision: result.decision,
   tier: result.tier,
   intent: result.intent,
   context: result.context,
   target: result.target,
   negation: result.negation,
   reason: result.reason,
  };
 }

 detectSimple(text) {
  if (typeof text !== 'string' || !text) {
   return { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' };
  }
  const sanitized = sanitize(text);
  if (!sanitized) {
   return { isToxic: false, matched: [], category: null, keyword: null, sanitized };
  }
  const matches = [];
  let highestTier = 'normal';
  let keyword = null;
  const tierOrder = ['normal', 'sensitive', 'high', 'slurs'];

  for (const entry of this.words) {
   if (!entry.regex.test(sanitized)) continue;
   matches.push(entry.raw);
   if (tierOrder.indexOf(entry.tier) > tierOrder.indexOf(highestTier)) {
    highestTier = entry.tier;
    keyword = entry.raw;
   }
  }

  for (const entry of this.patterns) {
   entry.regex.lastIndex = 0;
   if (!entry.regex.test(sanitized)) continue;
   matches.push(entry.source);
   if (!keyword) {
    highestTier = 'sensitive';
    keyword = entry.source;
   }
  }

  const matched = [...new Set(matches)];
  return {
   isToxic: matched.length > 0 && highestTier !== 'normal',
   matched,
   category: highestTier,
   keyword,
   tier: highestTier,
   sanitized,
  };
 }
}

export default ToxicityService;
