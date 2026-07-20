import { sanitize, escapeRegex } from '../utils/sanitize.js';

const TIER_LEVELS = { normal: 0, sensitive: 1, high: 2, slurs: 3 };

const TIER_BASE_SCORE = {
 normal: 0,
 sensitive: 5,
 high: 8,
 slurs: 10,
};

const TIER_CONTEXT_DISCOUNT = {
 normal: 0,
 sensitive: { quotation: 6, discussion: 5, explaining: 4, educational: 4, criticism: 3, literal: 5, negation: 5, default: 2 },
 high: { quotation: 4, discussion: 3, explaining: 2, educational: 2, criticism: 1, literal: 3, negation: 3, default: 1 },
 slurs: { quotation: 2, discussion: 1, explaining: 1, educational: 1, criticism: 0, literal: 1, negation: 1, default: 0 },
};

const TIER_TARGET_MULTIPLIER = {
 normal: 0,
 sensitive: 2,
 high: 3,
 slurs: 4,
};

const INTENTS = {
 GENERAL_EXPRESSION: 'GENERAL_EXPRESSION',
 PERSONAL_ATTACK: 'PERSONAL_ATTACK',
 SELF_REFERENCE: 'SELF_REFERENCE',
 EDUCATIONAL: 'EDUCATIONAL',
 QUOTATION: 'QUOTATION',
};

// Common general expressions that are not insults without a target
const GENERAL_EXPRESSIONS = [
 /\b(god\s*damn|goddamn|gd)\b/i,
 /\bwhat\s+the\s+(hell|fuck|heck|crap)\b/i,
 /\b(holy|bloody)\s+(hell|crap|shit)\b/i,
 /\bfor\s+fuck'?s?\s+sake\b/i,
 /\bJesus\s+Christ\b/i,
 /\boh\s+my\s+god\b/i,
 /\bwtf\b/i,
 /\bomg\b/i,
 /\bdamn\b/i,
];

/**
 * Contextual Moderation Pipeline
 *
 * 8-stage rule-based system with 4-tier word classification and intent detection.
 *
 * Tiers:
 * - normal: Never trigger warnings
 * - sensitive: Full contextual pipeline
 * - high: High confidence profanity, reduced context exceptions
 * - slurs: Maximum severity, minimal contextual exceptions
 *
 * Intents:
 * - GENERAL_EXPRESSION: Exclamation without target — IGNORE
 * - PERSONAL_ATTACK: Directed at someone — WARNING
 * - SELF_REFERENCE: Self-directed — reduced score
 * - EDUCATIONAL: Teaching/explaining — LOG_ONLY
 * - QUOTATION: Quoting — LOG_ONLY
 *
 * Stages:
 * 1. Normalize Text
 * 2. Detect Toxic Keywords (with tier assignment)
 * 3. Analyze Context
 * 4. Detect Negation
 * 5. Detect Mention/Target
 * 6. Classify Intent
 * 7. Calculate Toxic Score (tier + intent based)
 * 8. Decide Action
 */
export class ContextualModerationPipeline {
 constructor(badwordRepo, logger) {
  this.repo = badwordRepo;
  this.logger = logger;
  this.words = [];
  this.patterns = [];
  this.negations = [];
  this.contextPatterns = {};
  this.targetPronouns = [];
  this.selfPronouns = ['i', 'me', 'my', 'myself', 'aku', 'gue', 'gw', 'gua', 'saya', 'diri'];
  this.config = {
   toxicThreshold: 3,
   cooldownDurationMs: 15000,
   negationWindow: 3,
   targetRequired: false,
  };
  this.cooldowns = new Map();
  this.reload();
 }

 reload() {
  const data = this.repo.getAll();
  this.config = {
   toxicThreshold: 3,
   cooldownDurationMs: 15000,
   negationWindow: 3,
   targetRequired: false,
   ...(data.config || {}),
  };
  this.negations = (data.negations || []).map(n => n.toLowerCase());
  this.contextPatterns = data.contextPatterns || {};
  this.targetPronouns = (data.targetPronouns || []).map(p => p.toLowerCase());

  const seen = new Set();
  this.words = [];
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
     tier, raw, normalized,
     regex: new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized)}(?=[^a-z0-9]|$)`, 'i'),
    });
   }
  }

  this.patterns = [];
  for (const source of data.patterns || []) {
   if (typeof source !== 'string' || !source.trim()) continue;
   try { this.patterns.push({ source, regex: new RegExp(source, 'i') }); } catch {}
  }
  return this.getStats();
 }

 getStats() { return this.repo.getStats(); }

 // Stage 1: Text Normalization
 normalizeText(text) {
  if (typeof text !== 'string' || !text) return '';
  let normalized = sanitize(text);
  if (!normalized) return '';
  normalized = normalized.replace(/(.)\1{2,}/g, '$1');
  normalized = normalized.replace(/\b(\w+)(\s+\1){2,}\b/g, '$1');
  return normalized;
 }

 // Stage 2: Keyword Detection with Tier Assignment
 detectKeywords(normalizedText) {
  const candidates = [];
  for (const entry of this.words) {
   if (entry.regex.test(normalizedText)) {
    candidates.push({ word: entry.raw, normalized: entry.normalized, tier: entry.tier, tierLevel: TIER_LEVELS[entry.tier] });
   }
  }
  for (const entry of this.patterns) {
   entry.regex.lastIndex = 0;
   if (entry.regex.test(normalizedText)) {
    candidates.push({ word: entry.source, normalized: entry.source, tier: 'sensitive', tierLevel: TIER_LEVELS.sensitive });
   }
  }
  candidates.sort((a, b) => b.tierLevel - a.tierLevel);
  return candidates;
 }

 // Stage 3: Context Analysis
 analyzeContext(originalText, normalizedText) {
  const text = originalText.toLowerCase();
  const contexts = [];
  for (const [contextType, patterns] of Object.entries(this.contextPatterns)) {
   if (!Array.isArray(patterns)) continue;
   for (const pattern of patterns) {
    const isWordLike = /^[\w\s*]+$/.test(pattern);
    const regex = isWordLike ? new RegExp(`\\b${pattern}\\b`, 'i') : new RegExp(pattern, 'i');
    if (regex.test(text)) { contexts.push(contextType); break; }
   }
  }
  const safeContexts = ['quotation', 'quoting', 'explaining', 'asking', 'discussion', 'criticism', 'discussing', 'warning', 'educational', 'literal'];
  const isSafe = contexts.some(c => safeContexts.includes(c));
  const hasEntityProtection = contexts.includes('entityProtection');
  const hasLiteralContext = contexts.includes('literal');
  return { contexts, isSafe, isInsulting: !isSafe, hasEntityProtection, hasLiteralContext };
 }

 // Stage 4: Negation Detection
 detectNegation(normalizedText, candidates) {
  const words = normalizedText.split(/\s+/);
  const negatedCandidates = [];
  for (const candidate of candidates) {
   const keywordIndex = words.findIndex(w => w.includes(candidate.normalized) || candidate.normalized.includes(w));
   if (keywordIndex === -1) { negatedCandidates.push({ ...candidate, negated: false }); continue; }
   let isNegated = false;
   const windowStart = Math.max(0, keywordIndex - this.config.negationWindow);
   const windowEnd = Math.min(words.length - 1, keywordIndex + this.config.negationWindow);
   for (let i = windowStart; i <= windowEnd; i++) {
    if (this.negations.includes(words[i])) { isNegated = true; break; }
   }
   negatedCandidates.push({ ...candidate, negated: isNegated });
  }
  return negatedCandidates;
 }

 // Stage 5: Target Detection
 detectTarget(message, authorId, originalText = '') {
  const text = originalText || message.body || '';
  const hasMention = text.includes('@');
  const hasPronoun = this.targetPronouns.some(p => {
   const regex = new RegExp(`\\b${escapeRegex(p)}\\b`, 'i');
   return regex.test(text);
  });
  const hasReply = Boolean(message.quotedMessage);
  const directPronouns = this.targetPronouns.join('|');
  const hasDirectAddress = new RegExp(`(?:${directPronouns})\\s*(?:ini|itu)?\\b`, 'i').test(text);
  const hasTarget = hasMention || hasPronoun || hasReply || hasDirectAddress;

  // Check for self-reference (e.g., "I'm an idiot")
  const hasSelfRef = this.selfPronouns.some(p => {
   const regex = new RegExp(`\\b${escapeRegex(p)}\\b`, 'i');
   return regex.test(text);
  });

  return { hasTarget, hasMention, hasPronoun, hasReply, hasDirectAddress, hasSelfRef };
 }

 // Stage 6: Intent Classification
 classifyIntent(text, context, target, candidates) {
  const maxTier = Math.max(...candidates.map(c => c.tierLevel), 0);

  // Quotation context → QUOTATION (but NOT if quoting is the only context and it's a discussion)
  const isQuoting = context.contexts.includes('quotation') || context.contexts.includes('quoting');
  const isEducational = context.contexts.includes('educational') || context.contexts.includes('explaining') || context.contexts.includes('discussion');

  if (isQuoting && !isEducational) {
   return INTENTS.QUOTATION;
  }

  // Educational/explaining/discussion context → EDUCATIONAL
  if (isEducational) {
   return INTENTS.EDUCATIONAL;
  }

  // Literal context (animal/object discussion) → EDUCATIONAL
  if (context.hasLiteralContext) {
   return INTENTS.EDUCATIONAL;
  }

  // Check for general expression patterns FIRST (before tier checks)
  // If text matches a known general expression and no target → IGNORE
  if (!target.hasTarget) {
   for (const pattern of GENERAL_EXPRESSIONS) {
    if (pattern.test(text)) {
     return INTENTS.GENERAL_EXPRESSION;
    }
   }
  }

  // Target present → PERSONAL_ATTACK
  if (target.hasTarget && !context.isSafe) {
   return INTENTS.PERSONAL_ATTACK;
  }

  // High/slurs tier words without target are still potential attacks
  if (maxTier >= TIER_LEVELS.high && !target.hasTarget) {
   return INTENTS.PERSONAL_ATTACK;
  }

  // Self-reference → SELF_REFERENCE
  if (target.hasSelfRef && !target.hasTarget) {
   return INTENTS.SELF_REFERENCE;
  }

  // No target, no general expression → general expression for sensitive words
  if (!target.hasTarget) {
   return INTENTS.GENERAL_EXPRESSION;
  }

  return INTENTS.PERSONAL_ATTACK;
 }

 // Stage 7: Tier-Based Toxic Score Calculation (intent-aware)
 calculateToxicScore(candidates, context, target, intent) {
  let score = 0;
  const maxTier = Math.max(...candidates.map(c => c.tierLevel), 0);

  // General expression with no target → score = 0
  if (intent === INTENTS.GENERAL_EXPRESSION) {
   return 0;
  }

  for (const candidate of candidates) {
   const tier = candidate.tier;
   let keywordScore = TIER_BASE_SCORE[tier];
   if (tier === 'normal') continue;

   // Negation reduces score
   if (candidate.negated) {
    const negDiscount = TIER_CONTEXT_DISCOUNT[tier].negation || 0;
    keywordScore = Math.max(0, keywordScore - negDiscount);
   }

   // Context discounts (tier-specific)
   if (context.isSafe) {
    const discounts = TIER_CONTEXT_DISCOUNT[tier];
    let contextDiscount = discounts.default || 0;
    for (const ctx of context.contexts) {
     if (discounts[ctx] !== undefined) contextDiscount = Math.max(contextDiscount, discounts[ctx]);
    }
    keywordScore = Math.max(0, keywordScore - contextDiscount);
   }

   // Entity protection (only for sensitive tier)
   if (tier === 'sensitive' && context.hasEntityProtection && !target.hasTarget) {
    keywordScore = Math.max(0, keywordScore - 3);
   }

   // Literal context
   if (context.hasLiteralContext) {
    const literalDiscount = TIER_CONTEXT_DISCOUNT[tier].literal || 0;
    keywordScore = Math.max(0, keywordScore - literalDiscount);
   }

   // Intent-based modifiers
   if (intent === INTENTS.PERSONAL_ATTACK) {
    keywordScore += TIER_TARGET_MULTIPLIER[tier];
   } else if (intent === INTENTS.SELF_REFERENCE) {
    keywordScore = Math.max(0, keywordScore - 2);
   } else if (intent === INTENTS.EDUCATIONAL || intent === INTENTS.QUOTATION) {
    keywordScore = Math.max(0, keywordScore - 3);
   }

   // Repeated same word
   const sameWordCount = candidates.filter(c => c.normalized === candidate.normalized).length;
   if (sameWordCount > 1) keywordScore = Math.min(10, keywordScore + sameWordCount);

   // Direct personal attack bonus
   if (intent === INTENTS.PERSONAL_ATTACK && !context.isSafe) {
    keywordScore = Math.min(10, keywordScore + 1);
   }

   score += keywordScore;
  }

  const tierMultiplier = 1 + (maxTier * 0.15);
  score = Math.round(score * tierMultiplier);
  return score;
 }

 // Stage 8: Decision Engine (intent-aware)
 decideAction(score, context, target, candidates, intent) {
  const threshold = this.config.toxicThreshold;
  const maxTier = Math.max(...candidates.map(c => c.tierLevel), 0);
  const dominantTier = Object.keys(TIER_LEVELS).find(k => TIER_LEVELS[k] === maxTier) || 'sensitive';

  // Normal tier words always ignore
  if (maxTier === 0) {
   return { action: 'IGNORE', score: 0, threshold, reason: 'Normal tier word — never triggers' };
  }

  // General expression with no target → always ignore
  if (intent === INTENTS.GENERAL_EXPRESSION) {
   return { action: 'IGNORE', score: 0, threshold, reason: 'General expression — not directed at anyone' };
  }

  // Self-reference → ignore
  if (intent === INTENTS.SELF_REFERENCE) {
   return { action: 'LOG_ONLY', score, threshold, reason: 'Self-referential — not an attack' };
  }

  // Below threshold
  if (score < threshold) {
   return { action: 'IGNORE', score, threshold, reason: 'Score below threshold' };
  }

  // Slurs tier
  if (dominantTier === 'slurs') {
   if (context.isSafe && score < threshold * 2) {
    return { action: 'LOG_ONLY', score, threshold, reason: 'Slur in safe context — logged only' };
   }
   return { action: 'WARNING', score, threshold, reason: 'Hate speech detected' };
  }

  // High tier
  if (dominantTier === 'high') {
   if (context.isSafe) {
    if (score < threshold * 2) return { action: 'LOG_ONLY', score, threshold, reason: 'Profanity in safe context — logged only' };
    return { action: 'WARNING', score, threshold, reason: 'Severe profanity even in context' };
   }
  }

  // Sensitive tier
  if (context.isSafe) {
   return { action: 'LOG_ONLY', score, threshold, reason: 'Safe context detected' };
  }

  if (score < threshold * 2) return { action: 'WARNING', score, threshold, reason: 'Toxic content detected' };
  if (score < threshold * 3) return { action: 'MUTE', score, threshold, reason: 'Severe toxic content' };
  return { action: 'BAN', score, threshold, reason: 'Extreme toxic content' };
 }

 checkCooldown(userId, keyword) {
  const key = `${userId}:${keyword}`;
  const now = Date.now();
  const lastWarning = this.cooldowns.get(key);
  if (lastWarning && (now - lastWarning) < this.config.cooldownDurationMs) return true;
  this.cooldowns.set(key, now);
  return false;
 }

 cleanupCooldowns() {
  const now = Date.now();
  for (const [key, timestamp] of this.cooldowns.entries()) {
   if ((now - timestamp) >= this.config.cooldownDurationMs) this.cooldowns.delete(key);
  }
 }

 /** Start periodic cleanup to prevent memory leaks */
 startCleanup() {
  if (this._cleanupInterval) return;
  this._cleanupInterval = setInterval(() => this.cleanupCooldowns(), Math.min(this.config.cooldownDurationMs, 30000));
 }

 /** Stop cleanup interval */
 stopCleanup() {
  if (this._cleanupInterval) {
   clearInterval(this._cleanupInterval);
   this._cleanupInterval = null;
  }
 }

 // Main detection method — runs all 8 stages
 detect(text, message = {}, authorId = '') {
  const normalizedText = this.normalizeText(text);
  if (!normalizedText) {
   return this.createResult(false, [], '', '', { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' });
  }
  const candidates = this.detectKeywords(normalizedText);
  const context = this.analyzeContext(text, normalizedText);
  const negatedCandidates = this.detectNegation(normalizedText, candidates);
  const target = this.detectTarget(message, authorId, text);
  const intent = this.classifyIntent(text, context, target, negatedCandidates);
  const score = this.calculateToxicScore(negatedCandidates, context, target, intent);
  const decision = this.decideAction(score, context, target, negatedCandidates, intent);
  const matched = negatedCandidates.map(c => c.word);
  const category = negatedCandidates[0]?.tier || null;
  const keyword = negatedCandidates[0]?.word || null;
  const tier = negatedCandidates[0]?.tier || null;

  if (decision.action === 'WARNING' && keyword) {
   if (this.checkCooldown(authorId, keyword)) {
    decision.action = 'LOG_ONLY';
    decision.reason = 'Warning cooldown active';
   }
  }

  this.logDecision({
   user: authorId, message: text, keyword: keyword,
   tier, intent, context: context.contexts.join(', ') || 'none',
   target: target.hasTarget,
   negation: negatedCandidates.some(c => c.negated),
   score, decision: decision.action,
  });

  return {
   isToxic: decision.action === 'WARNING' || decision.action === 'MUTE' || decision.action === 'BAN',
   matched, category, keyword, sanitized: normalizedText,
   score, decision: decision.action, context: context.contexts,
   tier, intent, target: target.hasTarget,
   negation: negatedCandidates.some(c => c.negated),
   reason: decision.reason,
  };
 }

 createResult(isToxic, matched, category, keyword, sanitized) {
  return {
   isToxic, matched, category, keyword, sanitized,
   score: 0, decision: isToxic ? 'WARNING' : 'IGNORE',
   context: [], tier: null, intent: null, target: false, negation: false, reason: '',
  };
 }

 logDecision(decision) {
  if (this.logger) this.logger.debug('Moderation pipeline decision', decision);
 }
}

export default ContextualModerationPipeline;
