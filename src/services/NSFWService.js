/**
 * @file NSFWService — detects NSFW content from the categories defined in
 * data/nsfw.json. This service ONLY detects; it never warns or bans. The
 * decision/punishment is left to ModerationService (invoked by nsfwHandler).
 *
 * Severity model (driven by category):
 *   - low    : sexual_terms, pornography, sex_toys
 *   - medium : adult_services, sexual_harassment
 *   - high   : adult_links (websites / malicious links)
 *
 * False-positive protection: if the message contains an educational or
 * medical context token (e.g. "biology", "doctor", "anatomy"), detection is
 * suppressed to minimise incorrect flags during legitimate discussions.
 */

import { sanitize, escapeRegex } from '../utils/sanitize.js';

/** Category -> base severity. */
const CATEGORY_SEVERITY = Object.freeze({
  sexual_terms: 'low',
  pornography: 'low',
  sex_toys: 'low',
  adult_services: 'medium',
  sexual_harassment: 'medium',
  adult_links: 'high',
});

/**
 * Tokens that indicate an educational / medical context. If any appear in a
 * message, NSFW detection is skipped to avoid false positives.
 */
const SAFE_CONTEXT_TOKENS = [
  'education', 'educational', 'edu', 'biology', 'biological', 'reproduction',
  'reproductive', 'health', 'healthy', 'doctor', 'doctors', 'medical',
  'medicine', 'anatomy', 'anatomical', 'pregnant', 'pregnancy', 'school',
  'lesson', 'lessons', 'class', 'study', 'science', 'scientific', 'textbook',
  'exam', 'nurse', 'nursing', 'hospital', 'clinic', 'clinical', 'physiology',
  'hygiene', 'puberty', 'text book',
];

export class NSFWService {
  /**
   * @param {import('../database/repositories/NSFWRepository.js').NSFWRepository} nsfwRepo
   */
  constructor(nsfwRepo) {
    this.repo = nsfwRepo;
    this.reload();
  }

  /** Reload configuration and word lists from the repository. */
  reload() {
    const s = this.repo.getSettings();
    this.enabled = s.enabled;
    this.warnLimit = s.warnLimit;
    this.highSeverityBan = s.highSeverityBan;
    this.categories = s.categories;
  }

  /**
   * Whether the message is in an educational / medical context.
   * @param {string} text
   * @returns {boolean}
   */
  isEducationalContext(text) {
    const clean = sanitize(text);
    if (!clean) return false;
    for (const token of SAFE_CONTEXT_TOKENS) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`, 'i');
      if (re.test(clean)) return true;
    }
    return false;
  }

  /**
   * Detect NSFW content in a message.
   * @param {string} text
   * @returns {{
   *   detected: boolean,
   *   severity?: 'low'|'medium'|'high',
   *   category?: string,
   *   matched?: string[]
   * }}
   */
  detect(text) {
    if (!text || typeof text !== 'string' || !this.repo.isEnabled()) {
      return { detected: false };
    }
    // False-positive guard: educational / medical discussions.
    if (this.isEducationalContext(text)) {
      return { detected: false };
    }

    const clean = sanitize(text);
    if (!clean) return { detected: false };

    const matched = new Set();
    const RANK = { low: 1, medium: 2, high: 3 };
    let best = null;

    for (const [cat, words] of Object.entries(this.categories)) {
      if (!Array.isArray(words)) continue;
      for (const raw of words) {
        const word = sanitize(raw);
        if (!word) continue;
        const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(word)}([^a-z0-9]|$)`, 'i');
        if (re.test(clean)) {
          matched.add(raw);
          const severity = CATEGORY_SEVERITY[cat] || 'low';
          const rank = RANK[severity] || 1;
          if (!best || rank > best.rank) {
            best = { category: cat, severity, rank };
          }
        }
      }
    }

    if (!best) return { detected: false };
    return {
      detected: true,
      severity: best.severity,
      category: best.category,
      matched: [...matched],
    };
  }
}

export default NSFWService;
