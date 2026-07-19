const MODULE_KEYS = ['toxicity', 'nsfw', 'advertisement', 'raid', 'sticker'];

const RANGE_MS = {
  today: 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: null,
};

const CACHE_TTL_MS = 30_000;

export class AnalyticsService {
  constructor({ repos, eventBus = null }) {
    this.repos = repos;
    this._cache = new Map();
    if (eventBus) {
      this._listener = () => this.invalidate();
      eventBus.on('warning:issued', this._listener);
      eventBus.on('user:banned', this._listener);
      eventBus.on('user:kicked', this._listener);
      eventBus.on('toxicity:detected', this._listener);
      eventBus.on('settings:changed', this._listener);
    }
  }

  _cacheKey(range) {
    return `analytics:${range}`;
  }

  _getCache(key) {
    const entry = this._cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
    return null;
  }

  _setCache(key, data) {
    this._cache.set(key, { data, ts: Date.now() });
  }

  invalidate() {
    this._cache.clear();
  }

  getOverview(range = 'all') {
    const cached = this._getCache(this._cacheKey(range));
    if (cached) return cached;

    const cutoff = RANGE_MS[range] != null ? Date.now() - RANGE_MS[range] : null;

    const messagesSeen = this.repos.settings.getMessagesSeen();
    const blockedMessages = this.repos.settings.getBlockedMessages();
    const totalWarnings = this.repos.warnings.count();
    const activeBans = this.repos.bans.activeCount();

    let toxicDetections = 0;
    let nsfwDetections = 0;
    let adDetections = 0;
    let raidDetections = 0;
    let spamDetections = 0;

    const allIncidents = [];

    for (const key of MODULE_KEYS) {
      const incidents = this.repos[key].getIncidents() || [];
      for (const inc of incidents) {
        if (cutoff && (inc.timestamp || 0) < cutoff) continue;
        allIncidents.push({ ...inc, module: key });
      }
    }

    for (const inc of allIncidents) {
      switch (inc.module) {
        case 'toxicity': toxicDetections++; break;
        case 'nsfw': nsfwDetections++; break;
        case 'advertisement': adDetections++; break;
        case 'raid': raidDetections++; break;
        case 'sticker': spamDetections++; break;
      }
    }

    const blockedInRange = cutoff
      ? allIncidents.length
      : blockedMessages;

    const result = {
      range,
      messagesSeen,
      blockedMessages: blockedInRange,
      toxicDetections,
      nsfwDetections,
      adDetections,
      raidDetections,
      spamDetections,
      totalWarnings,
      activeBans,
    };

    this._setCache(this._cacheKey(range), result);
    return result;
  }

  getTopViolations(range = 'all', limit = 10) {
    const cutoff = RANGE_MS[range] != null ? Date.now() - RANGE_MS[range] : null;
    const triggers = {};

    const moduleLabels = {
      toxicity: 'Toxic Language',
      nsfw: 'NSFW Content',
      advertisement: 'Advertising / Promotion',
      raid: 'Raid / Mass Pinging',
      sticker: 'Sticker Spam',
    };

    for (const [key, label] of Object.entries(moduleLabels)) {
      triggers[key] = { id: key, title: label, count: 0, punishment: 'Auto', module: key };
    }

    for (const key of MODULE_KEYS) {
      const incidents = this.repos[key].getIncidents() || [];
      for (const inc of incidents) {
        if (cutoff && (inc.timestamp || 0) < cutoff) continue;
        if (triggers[key]) triggers[key].count++;
      }
    }

    const warnings = this.repos.warnings.all();
    for (const w of warnings) {
      for (const r of (w.reasons || [])) {
        if (cutoff && (r.at || 0) < cutoff) continue;
        const cat = this._categorize(r.reason);
        const key = this._categoryToModule(cat);
        if (key && triggers[key]) {
          triggers[key].count++;
        }
      }
    }

    return Object.values(triggers)
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getUserProfile(userId) {
    const warnings = this.repos.warnings.all().filter((w) => w.userId === userId);
    const bans = this.repos.bans.all().filter((b) => b.userId === userId);
    const totalWarnings = warnings.reduce((sum, w) => sum + (w.count || 0), 0);
    const totalBans = bans.length;

    const violationsByCategory = {};
    for (const w of warnings) {
      for (const r of (w.reasons || [])) {
        const cat = this._categorize(r.reason);
        violationsByCategory[cat] = (violationsByCategory[cat] || 0) + 1;
      }
    }

    for (const key of MODULE_KEYS) {
      const incidents = this.repos[key].getIncidents() || [];
      for (const inc of incidents) {
        if (inc.user !== userId) continue;
        const cat = inc.category || inc.type || key;
        violationsByCategory[cat] = (violationsByCategory[cat] || 0) + 1;
      }
    }

    let mostCommonViolation = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(violationsByCategory)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonViolation = cat;
      }
    }

    const totalViolations = Object.values(violationsByCategory).reduce((a, b) => a + b, 0);

    const activeWarnings = warnings.filter((w) => w.count > 0);
    const warnLimit = this.repos.settings.getWarningEscalation().levels?.slice(-1)[0]?.threshold || 3;
    const currentWarnCount = activeWarnings.reduce((sum, w) => sum + w.count, 0);

    const trustScore = this._calculateTrustScore(totalViolations, totalBans, currentWarnCount, warnLimit);

    let lastAction = 'None';
    let lastActionTime = 0;
    const allActions = [
      ...warnings.map((w) => ({ type: 'Warning', time: w.updatedAt || w.createdAt, detail: w })),
      ...bans.map((b) => ({ type: 'Ban', time: b.bannedAt, detail: b })),
    ];
    for (const a of allActions) {
      if (a.time > lastActionTime) {
        lastActionTime = a.time;
        lastAction = a.type;
      }
    }

    const groups = new Set();
    for (const w of warnings) if (w.groupId) groups.add(w.groupId);
    for (const b of bans) if (b.groupId) groups.add(b.groupId);

    return {
      userId,
      totalWarnings: currentWarnCount,
      warnLimit,
      totalViolations,
      totalBans,
      mostCommonViolation: mostCommonViolation || 'None',
      lastAction,
      lastActionTime,
      trustScore,
      groups: [...groups],
      violationsByCategory,
    };
  }

  _calculateTrustScore(totalViolations, totalBans, currentWarnings, warnLimit) {
    let score = 100;
    score -= Math.min(totalViolations * 2, 40);
    score -= Math.min(totalBans * 15, 30);
    score -= Math.min((currentWarnings / Math.max(warnLimit, 1)) * 20, 20);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _categoryToModule(category) {
    const map = {
      Toxicity: 'toxicity',
      NSFW: 'nsfw',
      Advertisement: 'advertisement',
      Spam: 'toxicity',
      Raid: 'raid',
      'Sticker Spam': 'sticker',
    };
    return map[category] || null;
  }

  _categorize(reason) {
    if (!reason) return 'Other';
    const lower = reason.toLowerCase();
    if (lower.includes('toxic')) return 'Toxicity';
    if (lower.includes('nsfw') || lower.includes('adult') || lower.includes('sexual')) return 'NSFW';
    if (lower.includes('spam')) return 'Spam';
    if (lower.includes('ad') || lower.includes('promo') || lower.includes('selling')) return 'Advertisement';
    if (lower.includes('raid')) return 'Raid';
    if (lower.includes('sticker')) return 'Sticker Spam';
    return 'Other';
  }

  getIncidentDetail(module, incidentId) {
    const repo = this.repos[module];
    if (!repo) return null;
    const incidents = repo.getIncidents() || [];
    return incidents.find((i) => i.id === incidentId) || null;
  }

  getEnhancedIncidents(module, range = 'all', limit = 50) {
    const cutoff = RANGE_MS[range] != null ? Date.now() - RANGE_MS[range] : null;
    const repo = this.repos[module];
    if (!repo) return [];

    const incidents = (repo.getIncidents() || [])
      .filter((i) => !cutoff || (i.timestamp || 0) >= cutoff)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);

    return incidents.map((inc) => ({
      ...inc,
      module,
      rule: this._mapIncidentToRule(inc),
      actionLabel: this._formatAction(inc),
    }));
  }

  _mapIncidentToRule(inc) {
    const rules = this.repos.rules.getRules();
    const cat = (inc.category || inc.type || '').toLowerCase();
    for (const [id, rule] of Object.entries(rules)) {
      if (rule.title.toLowerCase().includes(cat) || cat.includes(rule.title.toLowerCase())) {
        return { id, title: rule.title };
      }
    }
    return null;
  }

  _formatAction(inc) {
    const action = (inc.action || '').toLowerCase();
    if (action === 'warn') return `Warning ${inc.severity || ''}`.trim();
    if (action === 'ban') return 'Ban';
    if (action === 'kick') return 'Kick';
    if (action === 'log') return 'Logged';
    return action || 'Detected';
  }
}

export default AnalyticsService;
