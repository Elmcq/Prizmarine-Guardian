/**
 * @file AdvertisementService — detects commercial advertisement content from
 * the categories defined in data/advertisement.json. This service ONLY
 * detects; it never warns or bans. The decision/punishment is left to
 * ModerationService (invoked by advertisementHandler).
 *
 * Severity model (driven by category):
 *   - low    : selling           (products / items / accounts for sale)
 *   - medium : service_promotion (promoting paid services)
 *
 * HIGH severity is NOT produced here — it is assigned dynamically by the
 * handler for repeated offenders and mass advertisement spam. This keeps the
 * detection logic pure and reusable.
 *
 * Exemption guard: messages that are clearly NON-commercial contexts
 * (Discord/WhatsApp/Telegram invites, YouTube/TikTok/GitHub links, Minecraft
 * servers, personal websites) are never flagged. The patterns live in
 * data/advertisement.json (`exemptions`) so they are fully data-driven.
 */

import { sanitize, escapeRegex } from '../utils/sanitize.js';

/** Category -> base severity. */
const CATEGORY_SEVERITY = Object.freeze({
  selling: 'low',
  service_promotion: 'medium',
});

/** Internal severity ranking used to pick the worst match. */
const RANK = Object.freeze({ low: 1, medium: 2, high: 3 });

export class AdvertisementService {
  /**
   * @param {import('../database/repositories/AdvertisementRepository.js').AdvertisementRepository} adRepo
   */
  constructor(adRepo) {
    this.repo = adRepo;
    this.reload();
  }

  /** Reload configuration, word lists and exemptions from the repository. */
  reload() {
    const s = this.repo.getSettings();
    this.enabled = s.enabled;
    this.warnLimit = s.warnLimit;
    this.highSeverityBan = s.highSeverityBan;
    this.categories = s.categories;
    this.exemptions = s.exemptions;
  }

  /**
   * Whether the message is a known non-commercial context that must be
   * ignored (Discord/Telegram/WhatsApp invites, YouTube/TikTok/GitHub links,
   * Minecraft servers, personal websites). Patterns come from the repository.
   * @param {string} text
   * @returns {boolean}
   */
  matchesExemption(text) {
    const lower = String(text || '').toLowerCase();
    for (const ex of this.exemptions || []) {
      const pattern = ex && (ex.pattern || ex);
      if (!pattern) continue;
      try {
        if (new RegExp(pattern, 'i').test(lower)) return true;
      } catch {
        // Skip malformed patterns rather than crashing detection.
      }
    }
    return false;
  }

  /**
   * Detect commercial advertisement content in a message.
   * @param {string} text
   * @returns {{
   *   detected: boolean,
   *   exempt?: boolean,
   *   severity?: 'low'|'medium'|'high',
   *   category?: string,
   *   matched?: string[]
   * }}
   */
  detect(text) {
    if (!text || typeof text !== 'string' || !this.repo.isEnabled()) {
      return { detected: false };
    }
    // Exemption guard: never flag non-commercial contexts.
    if (this.matchesExemption(text)) {
      return { detected: false, exempt: true };
    }

    const clean = sanitize(text);
    if (!clean) return { detected: false };

    const matched = new Set();
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

export default AdvertisementService;
