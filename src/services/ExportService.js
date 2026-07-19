const MODULE_KEYS = ['toxicity', 'nsfw', 'advertisement', 'raid', 'sticker'];

const RANGE_MS = {
  today: 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: null,
};

export class ExportService {
  constructor({ repos, analyticsService }) {
    this.repos = repos;
    this.analytics = analyticsService;
  }

  generateReport(range = 'all') {
    const cutoff = RANGE_MS[range] != null ? Date.now() - RANGE_MS[range] : null;

    const overview = this.analytics.getOverview(range);
    const topViolations = this.analytics.getTopViolations(range, 20);
    const auditRecords = this._filterByRange(this.repos.audit.all(500), cutoff);
    const warnings = this._filterByRange(this.repos.warnings.all(), cutoff);
    const bans = this._filterByRange(this.repos.bans.all(), cutoff);

    const incidents = [];
    for (const key of MODULE_KEYS) {
      const moduleIncidents = this.repos[key].getIncidents() || [];
      for (const inc of moduleIncidents) {
        if (cutoff && (inc.timestamp || 0) < cutoff) continue;
        incidents.push({ ...inc, module: key });
      }
    }
    incidents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return {
      generatedAt: new Date().toISOString(),
      range,
      overview,
      topViolations,
      incidents,
      warnings,
      bans,
      auditLog: auditRecords,
    };
  }

  toJSON(range = 'all') {
    return JSON.stringify(this.generateReport(range), null, 2);
  }

  toCSV(range = 'all') {
    const report = this.generateReport(range);
    const sections = [];

    sections.push('=== OVERVIEW ===');
    sections.push('Metric,Value');
    sections.push(`Messages Seen,${report.overview.messagesSeen}`);
    sections.push(`Blocked Messages,${report.overview.blockedMessages}`);
    sections.push(`Toxic Detections,${report.overview.toxicDetections}`);
    sections.push(`NSFW Detections,${report.overview.nsfwDetections}`);
    sections.push(`Advertisement Detections,${report.overview.adDetections}`);
    sections.push(`Raid Detections,${report.overview.raidDetections}`);
    sections.push(`Spam Detections,${report.overview.spamDetections}`);
    sections.push(`Total Warnings,${report.overview.totalWarnings}`);
    sections.push(`Active Bans,${report.overview.activeBans}`);
    sections.push('');

    sections.push('=== TOP VIOLATIONS ===');
    sections.push('Rank,Title,Triggers,Punishment');
    report.topViolations.forEach((v, i) => {
      sections.push(`${i + 1},"${this._escCSV(v.title)}",${v.count},${v.punishment}`);
    });
    sections.push('');

    sections.push('=== INCIDENTS ===');
    sections.push('Time,Module,User,Group,Category,Action,Score');
    for (const inc of report.incidents) {
      sections.push([
        new Date(inc.timestamp || 0).toISOString(),
        inc.module,
        inc.user || '',
        inc.group || '',
        inc.category || inc.type || '',
        inc.action || '',
        inc.score ?? '',
      ].map((v) => `"${this._escCSV(String(v))}"`).join(','));
    }
    sections.push('');

    sections.push('=== WARNINGS ===');
    sections.push('User,Group,Count,Reasons,Updated');
    for (const w of report.warnings) {
      sections.push([
        w.userId || '',
        w.groupId || '',
        w.count || 0,
        (w.reasons || []).map((r) => r.reason).join('; '),
        new Date(w.updatedAt || 0).toISOString(),
      ].map((v) => `"${this._escCSV(String(v))}"`).join(','));
    }
    sections.push('');

    sections.push('=== BANS ===');
    sections.push('User,Group,Reason,Banned At,Expires At');
    for (const b of report.bans) {
      sections.push([
        b.userId || '',
        b.groupId || '',
        b.reason || '',
        new Date(b.bannedAt || 0).toISOString(),
        new Date(b.expiresAt || 0).toISOString(),
      ].map((v) => `"${this._escCSV(String(v))}"`).join(','));
    }
    sections.push('');

    sections.push('=== AUDIT LOG ===');
    sections.push('Time,Action,User,Moderator,Reason');
    for (const a of report.auditLog) {
      sections.push([
        new Date(a.timestamp || 0).toISOString(),
        a.action || '',
        a.user || '',
        a.moderator || '',
        a.reason || '',
      ].map((v) => `"${this._escCSV(String(v))}"`).join(','));
    }

    return sections.join('\n');
  }

  _filterByRange(items, cutoff) {
    if (!cutoff) return items;
    return items.filter((item) => (item.timestamp || item.bannedAt || item.updatedAt || item.createdAt || 0) >= cutoff);
  }

  _escCSV(s) {
    return String(s).replace(/"/g, '""');
  }
}

export default ExportService;
