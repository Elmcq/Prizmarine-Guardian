import { sanitize, escapeRegex } from '../utils/sanitize.js';
import { ContextualModerationPipeline } from './ContextualModerationPipeline.js';

/**
 * ToxicityService - Wrapper for backward compatibility
 * 
 * This service now uses the ContextualModerationPipeline for detection.
 * The detect() method maintains the same interface for backwards compatibility.
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

  /**
   * Check if the module is enabled
   */
  isEnabled() {
    return this.repo.isEnabled();
  }

  /**
   * Reload configuration and keyword lists
   */
  reload() {
    const stats = this.pipeline.reload();
    
    // Keep legacy data for backward compatibility
    const data = this.repo.getAll();
    const seen = new Set();
    this.words = [];
    for (const [category, entries] of Object.entries(data)) {
      if (category === 'patterns' || !Array.isArray(entries)) continue;
      for (const raw of entries) {
        const normalized = sanitize(raw);
        if (!normalized) continue;
        const key = `${category}${normalized}`;
        if (seen.has(key)) continue;
        seen.add(key);
        this.words.push({
          category,
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

  /**
   * Get statistics
   */
  getStats() {
    return this.repo.getStats();
  }

  /**
   * Detect toxicity in a message
   * 
   * Maintains backward compatibility with existing code.
   * Uses the contextual pipeline for accurate detection.
   * 
   * @param {string} text - Message text
   * @param {object} message - Full message object (optional, for target detection)
   * @param {string} authorId - Message author ID (optional, for cooldown)
   * @returns {object} Detection result
   */
  detect(text, message = {}, authorId = '') {
    if (typeof text !== 'string' || !text) {
      return { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' };
    }
    
    const sanitized = sanitize(text);
    if (!sanitized) {
      return { isToxic: false, matched: [], category: null, keyword: null, sanitized };
    }
    
    // Use the contextual pipeline for detection
    const result = this.pipeline.detect(text, message, authorId);
    
    // Return in the same format as before for backward compatibility
    return {
      isToxic: result.isToxic,
      matched: result.matched,
      category: result.category,
      keyword: result.keyword,
      sanitized: result.sanitized,
      // Additional context info for debugging
      score: result.score,
      decision: result.decision,
      context: result.context,
      target: result.target,
      negation: result.negation,
      reason: result.reason,
    };
  }

  /**
   * Simple detection without context (for backward compatibility)
   * This method maintains the old behavior for code that doesn't need context
   */
  detectSimple(text) {
    if (typeof text !== 'string' || !text) {
      return { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' };
    }
    
    const sanitized = sanitize(text);
    if (!sanitized) {
      return { isToxic: false, matched: [], category: null, keyword: null, sanitized };
    }
    
    const matches = [];
    let category = null;
    let keyword = null;
    
    for (const entry of this.words) {
      if (!entry.regex.test(sanitized)) continue;
      matches.push(entry.raw);
      if (!category) {
        category = entry.category;
        keyword = entry.raw;
      }
    }
    
    for (const entry of this.patterns) {
      entry.regex.lastIndex = 0;
      if (!entry.regex.test(sanitized)) continue;
      matches.push(entry.source);
      if (!category) {
        category = 'patterns';
        keyword = entry.source;
      }
    }
    
    const matched = [...new Set(matches)];
    return { isToxic: matched.length > 0, matched, category, keyword, sanitized };
  }
}

export default ToxicityService;
