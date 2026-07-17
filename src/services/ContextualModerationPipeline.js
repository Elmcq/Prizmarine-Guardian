import { sanitize, escapeRegex } from '../utils/sanitize.js';

/**
 * Contextual Moderation Pipeline
 * 
 * 7-stage rule-based system to reduce false positives while keeping detection fast.
 * No AI/ML required - pure rule-based contextual analysis.
 * 
 * Stages:
 * 1. Normalize Text
 * 2. Detect Toxic Keywords (candidate collection only)
 * 3. Analyze Context
 * 4. Detect Negation
 * 5. Detect Mention/Target
 * 6. Calculate Toxic Score
 * 7. Decide Action
 */
export class ContextualModerationPipeline {
  constructor(badwordRepo, logger) {
    this.repo = badwordRepo;
    this.logger = logger;
    this.words = [];
    this.patterns = [];
    this.severityTable = {};
    this.negations = [];
    this.contextPatterns = {};
    this.targetPronouns = [];
    this.config = {
      toxicThreshold: 3,
      cooldownDurationMs: 15000,
      negationWindow: 3,
      targetRequired: false,
    };
    this.cooldowns = new Map();
    this.reload();
  }

  /**
   * Reload configuration from badwords.json
   */
  reload() {
    const data = this.repo.getAll();
    
    // Load severity table
    this.severityTable = data.severity || {};
    
    // Load configuration
    this.config = {
      toxicThreshold: 3,
      cooldownDurationMs: 15000,
      negationWindow: 3,
      targetRequired: false,
      ...(data.config || {}),
    };
    
    // Load negation dictionary
    this.negations = (data.negations || []).map(n => n.toLowerCase());
    
    // Load context patterns
    this.contextPatterns = data.contextPatterns || {};
    
    // Load target pronouns
    this.targetPronouns = (data.targetPronouns || []).map(p => p.toLowerCase());
    
    // Load keywords with severity
    const seen = new Set();
    this.words = [];
    for (const [category, entries] of Object.entries(data)) {
      if (category === 'patterns' || category === 'severity' || category === 'config' || 
          category === 'negations' || category === 'contextPatterns' || category === 'targetPronouns' ||
          category === 'incidents' || category === '_comment' || !Array.isArray(entries)) continue;
      
      for (const raw of entries) {
        const normalized = sanitize(raw);
        if (!normalized) continue;
        const key = `${category}${normalized}`;
        if (seen.has(key)) continue;
        seen.add(key);
        
        // Get severity from table, default to 5
        const severity = this.severityTable[normalized] || 5;
        
        this.words.push({
          category,
          raw,
          normalized,
          severity,
          regex: new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized)}(?=[^a-z0-9]|$)`, 'i'),
        });
      }
    }
    
    // Load patterns
    this.patterns = [];
    for (const source of data.patterns || []) {
      if (typeof source !== 'string' || !source.trim()) continue;
      try {
        this.patterns.push({ source, regex: new RegExp(source, 'i') });
      } catch {
        // Skip invalid patterns
      }
    }
    
    return this.getStats();
  }

  /**
   * Get statistics about the pipeline
   */
  getStats() {
    return this.repo.getStats();
  }

  /**
   * Stage 1: Text Normalization
   * Normalize message before scanning
   */
  normalizeText(text) {
    if (typeof text !== 'string' || !text) return '';
    
    let normalized = sanitize(text);
    if (!normalized) return '';
    
    // Normalize repeated characters (e.g., "GOOOBLOKKKK" -> "goblok")
    normalized = normalized.replace(/(.)\1{2,}/g, '$1');
    
    // Normalize repeated words
    normalized = normalized.replace(/\b(\w+)(\s+\1){2,}\b/g, '$1');
    
    return normalized;
  }

  /**
   * Stage 2: Keyword Detection
   * Collect candidate words - MUST NOT issue warnings
   */
  detectKeywords(normalizedText) {
    const candidates = [];
    
    // Check word list
    for (const entry of this.words) {
      if (entry.regex.test(normalizedText)) {
        candidates.push({
          word: entry.raw,
          normalized: entry.normalized,
          category: entry.category,
          severity: entry.severity,
        });
      }
    }
    
    // Check patterns
    for (const entry of this.patterns) {
      entry.regex.lastIndex = 0;
      if (entry.regex.test(normalizedText)) {
        candidates.push({
          word: entry.source,
          normalized: entry.source,
          category: 'patterns',
          severity: 5, // Default severity for pattern matches
        });
      }
    }
    
    return candidates;
  }

  /**
   * Stage 3: Context Analysis
   * Detect whether the message is insulting, quoting, explaining, asking, discussing, etc.
   */
  analyzeContext(originalText, normalizedText) {
    const text = originalText.toLowerCase();
    const contexts = [];
    
    // Check for quotation patterns (quoted text is always safe)
    for (const pattern of this.contextPatterns.quotation || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('quotation');
        break;
      }
    }
    
    // Check for quoting patterns
    for (const pattern of this.contextPatterns.quoting || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('quoting');
        break;
      }
    }
    
    // Check for explaining patterns
    for (const pattern of this.contextPatterns.explaining || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('explaining');
        break;
      }
    }
    
    // Check for asking patterns
    for (const pattern of this.contextPatterns.asking || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('asking');
        break;
      }
    }
    
    // Check for discussion patterns (safe context — discussing the word itself)
    for (const pattern of this.contextPatterns.discussion || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('discussion');
        break;
      }
    }
    
    // Check for criticizing patterns (criticism of entities, not personal attack)
    for (const pattern of this.contextPatterns.criticism || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('criticism');
        break;
      }
    }
    
    // Check for entity protection (mentions of public figures in non-personal context)
    let hasEntityProtection = false;
    for (const pattern of this.contextPatterns.entityProtection || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        hasEntityProtection = true;
        break;
      }
    }
    
    // Check for literal context (animal/object discussion, educational, non-insulting)
    let hasLiteralContext = false;
    for (const pattern of this.contextPatterns.literal || []) {
      if (new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i').test(text)) {
        hasLiteralContext = true;
        contexts.push('literal');
        break;
      }
    }
    
    // Check for discussing patterns
    for (const pattern of this.contextPatterns.discussing || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('discussing');
        break;
      }
    }
    
    // Check for warning patterns
    for (const pattern of this.contextPatterns.warning || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('warning');
        break;
      }
    }
    
    // Check for educational patterns
    for (const pattern of this.contextPatterns.educational || []) {
      if (new RegExp(pattern, 'i').test(text)) {
        contexts.push('educational');
        break;
      }
    }
    
    // Determine if context is safe (non-insulting)
    const safeContexts = ['quotation', 'quoting', 'explaining', 'asking', 'discussion', 'criticism', 'discussing', 'warning', 'educational', 'literal'];
    const isSafe = contexts.some(c => safeContexts.includes(c));
    
    return {
      contexts,
      isSafe,
      isInsulting: !isSafe,
      hasEntityProtection,
      hasLiteralContext,
    };
  }

  /**
   * Stage 4: Negation Detection
   * Check if toxic keywords are negated
   */
  detectNegation(normalizedText, candidates) {
    const words = normalizedText.split(/\s+/);
    const negatedCandidates = [];
    
    for (const candidate of candidates) {
      const keywordIndex = words.findIndex(w => 
        w.includes(candidate.normalized) || candidate.normalized.includes(w)
      );
      
      if (keywordIndex === -1) {
        negatedCandidates.push({ ...candidate, negated: false });
        continue;
      }
      
      // Check for negation words within window
      let isNegated = false;
      const windowStart = Math.max(0, keywordIndex - this.config.negationWindow);
      const windowEnd = Math.min(words.length - 1, keywordIndex + this.config.negationWindow);
      
      for (let i = windowStart; i <= windowEnd; i++) {
        if (this.negations.includes(words[i])) {
          isNegated = true;
          break;
        }
      }
      
      negatedCandidates.push({ ...candidate, negated: isNegated });
    }
    
    return negatedCandidates;
  }

  /**
   * Stage 5: Target Detection
   * Determine if the message is directed toward someone
   */
  detectTarget(message, authorId, originalText = '') {
    const text = originalText || message.body || '';
    const lowerText = text.toLowerCase();
    
    // Check for @mentions
    const hasMention = text.includes('@');
    
    // Check for target pronouns (with word boundaries to avoid matching "lo" inside "goblok")
    const hasPronoun = this.targetPronouns.some(p => {
      const regex = new RegExp(`\\b${escapeRegex(p)}\\b`, 'i');
      return regex.test(text);
    });
    
    // Check for reply (message has quotedMessage)
    const hasReply = Boolean(message.quotedMessage);
    
    // Check for direct address patterns (with word boundaries)
    const directPronouns = this.targetPronouns.join('|');
    const hasDirectAddress = new RegExp(`(?:${directPronouns})\\s*(?:ini|itu)?\\b`, 'i').test(text);
    
    const hasTarget = hasMention || hasPronoun || hasReply || hasDirectAddress;
    
    return {
      hasTarget,
      hasMention,
      hasPronoun,
      hasReply,
      hasDirectAddress,
    };
  }

  /**
   * Stage 6: Toxic Score Calculation
   * Calculate final score based on keyword severity, context, negation, and target
   */
  calculateToxicScore(candidates, context, target) {
    let score = 0;
    
    for (const candidate of candidates) {
      let keywordScore = candidate.severity;
      
      // Reduce score if negated
      if (candidate.negated) {
        keywordScore = Math.max(0, keywordScore - 5);
      }
      
      // Reduce score for safe contexts
      if (context.isSafe) {
        // Quotation = almost completely safe
        if (context.contexts.includes('quotation')) {
          keywordScore = Math.max(0, keywordScore - 6);
        }
        // Discussion about the word itself = very safe
        else if (context.contexts.includes('discussion')) {
          keywordScore = Math.max(0, keywordScore - 5);
        }
        // Explaining / educational = safe
        else if (context.contexts.includes('explaining') || context.contexts.includes('educational')) {
          keywordScore = Math.max(0, keywordScore - 4);
        }
        // Criticism (non-personal) = somewhat safe
        else if (context.contexts.includes('criticism')) {
          keywordScore = Math.max(0, keywordScore - 3);
        }
        // Other safe contexts
        else {
          keywordScore = Math.max(0, keywordScore - 2);
        }
      }
      
      // Reduce score for entity protection (public figures, not personal attack)
      if (context.hasEntityProtection && !target.hasTarget) {
        keywordScore = Math.max(0, keywordScore - 3);
      }
      
      // Reduce score for literal context (animal/object discussion, multi-meaning words)
      if (context.hasLiteralContext) {
        keywordScore = Math.max(0, keywordScore - 5);
      }
      
      // Increase score if target exists
      if (target.hasTarget) {
        keywordScore = Math.min(10, keywordScore + 2);
      }
      
      // Increase score for repeated insults (same word multiple times)
      const sameWordCount = candidates.filter(c => c.normalized === candidate.normalized).length;
      if (sameWordCount > 1) {
        keywordScore = Math.min(10, keywordScore + sameWordCount);
      }
      
      // Direct personal attack bonus (target + no safe context)
      if (target.hasTarget && !context.isSafe) {
        keywordScore = Math.min(10, keywordScore + 1);
      }
      
      score += keywordScore;
    }
    
    return score;
  }

  /**
   * Stage 7: Decision Engine
   * Decide action based on toxic score and configuration
   */
  decideAction(score, context, target) {
    const threshold = this.config.toxicThreshold;
    
    // No action if score is below threshold
    if (score < threshold) {
      return {
        action: 'IGNORE',
        score,
        threshold,
        reason: 'Score below threshold',
      };
    }
    
    // Log only if context is safe (educational, quoting, etc.)
    if (context.isSafe) {
      return {
        action: 'LOG_ONLY',
        score,
        threshold,
        reason: 'Safe context detected',
      };
    }
    
    // Warning if score meets threshold
    if (score < threshold * 2) {
      return {
        action: 'WARNING',
        score,
        threshold,
        reason: 'Toxic content detected',
      };
    }
    
    // Mute for higher scores
    if (score < threshold * 3) {
      return {
        action: 'MUTE',
        score,
        threshold,
        reason: 'Severe toxic content',
      };
    }
    
    // Ban for extreme scores
    return {
      action: 'BAN',
      score,
      threshold,
      reason: 'Extreme toxic content',
    };
  }

  /**
   * Check warning cooldown
   * Prevent duplicate warnings within cooldown period
   */
  checkCooldown(userId, keyword) {
    const key = `${userId}:${keyword}`;
    const now = Date.now();
    const lastWarning = this.cooldowns.get(key);
    
    if (lastWarning && (now - lastWarning) < this.config.cooldownDurationMs) {
      return true; // On cooldown
    }
    
    this.cooldowns.set(key, now);
    return false;
  }

  /**
   * Clean up expired cooldowns
   */
  cleanupCooldowns() {
    const now = Date.now();
    for (const [key, timestamp] of this.cooldowns.entries()) {
      if ((now - timestamp) >= this.config.cooldownDurationMs) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Main detection method - runs all 7 stages
   * @param {string} text - Original message text
   * @param {object} message - Full message object (for reply detection)
   * @param {string} authorId - Message author ID
   * @returns {object} Detection result
   */
  detect(text, message = {}, authorId = '') {
    // Stage 1: Normalize Text
    const normalizedText = this.normalizeText(text);
    if (!normalizedText) {
      return this.createResult(false, [], '', '', { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' });
    }
    
    // Stage 2: Detect Toxic Keywords
    const candidates = this.detectKeywords(normalizedText);
    
    // Stage 3: Analyze Context
    const context = this.analyzeContext(text, normalizedText);
    
    // Stage 4: Detect Negation
    const negatedCandidates = this.detectNegation(normalizedText, candidates);
    
    // Stage 5: Detect Target
    const target = this.detectTarget(message, authorId, text);
    
    // Stage 6: Calculate Toxic Score
    const score = this.calculateToxicScore(negatedCandidates, context, target);
    
    // Stage 7: Decide Action
    const decision = this.decideAction(score, context, target);
    
    // Prepare matched keywords
    const matched = negatedCandidates.map(c => c.word);
    const category = negatedCandidates[0]?.category || null;
    const keyword = negatedCandidates[0]?.word || null;
    
    // Check cooldown for warnings
    if (decision.action === 'WARNING' && keyword) {
      if (this.checkCooldown(authorId, keyword)) {
        decision.action = 'LOG_ONLY';
        decision.reason = 'Warning cooldown active';
      }
    }
    
    // Log detailed moderation decision
    this.logDecision({
      user: authorId,
      message: text,
      keyword: keyword,
      context: context.contexts.join(', ') || 'none',
      target: target.hasTarget,
      negation: negatedCandidates.some(c => c.negated),
      score: score,
      decision: decision.action,
    });
    
    return {
      isToxic: decision.action === 'WARNING' || decision.action === 'MUTE' || decision.action === 'BAN',
      matched,
      category,
      keyword,
      sanitized: normalizedText,
      score,
      decision: decision.action,
      context: context.contexts,
      target: target.hasTarget,
      negation: negatedCandidates.some(c => c.negated),
      reason: decision.reason,
    };
  }

  /**
   * Create a result object
   */
  createResult(isToxic, matched, category, keyword, sanitized) {
    return {
      isToxic,
      matched,
      category,
      keyword,
      sanitized,
      score: 0,
      decision: isToxic ? 'WARNING' : 'IGNORE',
      context: [],
      target: false,
      negation: false,
      reason: '',
    };
  }

  /**
   * Log detailed moderation decision
   */
  logDecision(decision) {
    if (this.logger) {
      this.logger.debug('Moderation pipeline decision', decision);
    }
  }
}

export default ContextualModerationPipeline;
