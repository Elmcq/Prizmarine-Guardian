/**
 * @file ToxicityService — detects toxic messages against the word lists
 * stored in data/badwords.json (never hard-coded; loaded via BadwordRepository).
 *
 * Matching is done on a sanitised, normalised copy of the text so that
 * uppercase, accents and light leetspeak are handled. Words are matched on
 * word boundaries so "class" never matches inside "classic".
 */

import { sanitize, escapeRegex } from '../utils/sanitize.js';

export class ToxicityService {
  /**
   * @param {import('../database/repositories/BadwordRepository.js').BadwordRepository} badwordRepo
   */
  constructor(badwordRepo) {
    /** @private */
    this.repo = badwordRepo;
    /** @private Cached category -> string[] */
    this.categories = [];
    /** @private Compiled regex patterns */
    this.patterns = [];
    this.reload();
  }

  /** Reload word lists from disk (call after editing badwords.json). */
  reload() {
    const data = this.repo.getAll();
    // Each entry is [categoryName, words[]]; skip the `patterns` key.
    this.categories = Object.entries(data)
      .filter(([key]) => key !== 'patterns' && Array.isArray(data[key]))
      .map(([category, words]) => [category, words.filter((w) => typeof w === 'string')]);

    this.patterns = [];
    for (const p of data.patterns || []) {
      try {
        this.patterns.push(new RegExp(p, 'i'));
      } catch {
        // Ignore invalid patterns rather than crashing the bot.
      }
    }
  }

  /**
   * Detect whether a message is toxic.
   * @param {string} text
   * @returns {{ isToxic: boolean, matched: string[], category: string|null }}
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return { isToxic: false, matched: [], category: null };
    }

    const clean = sanitize(text);
    if (!clean) return { isToxic: false, matched: [], category: null };

    const matched = new Set();
    let category = null;

    for (const [cat, words] of this.categories) {
      for (const raw of words) {
        const word = sanitize(raw);
        if (!word) continue;
        // Word-boundary match against the sanitised text.
        const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(word)}([^a-z0-9]|$)`, 'i');
        if (re.test(clean)) {
          matched.add(raw);
          if (!category) category = cat;
        }
      }
    }

    for (const pattern of this.patterns) {
      if (pattern.test(clean)) {
        matched.add(pattern.source);
        if (!category) category = 'pattern';
      }
    }

    return {
      isToxic: matched.size > 0,
      matched: [...matched],
      category,
    };
  }
}

export default ToxicityService;
