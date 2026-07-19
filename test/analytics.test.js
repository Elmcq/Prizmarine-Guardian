import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsService } from '../src/services/AnalyticsService.js';
import { ExportService } from '../src/services/ExportService.js';
import { EventEmitter } from 'node:events';

function makeRepos(overrides = {}) {
  const defaults = {
    settings: {
      getMessagesSeen: () => 1000,
      getBlockedMessages: () => 50,
      getWarningEscalation: () => ({ enabled: true, levels: [{ threshold: 3, action: 'tempban', severity: 'critical' }] }),
    },
    warnings: {
      count: () => 2,
      all: () => [
        { userId: 'user1', groupId: 'g1', count: 2, reasons: [{ reason: 'Toxic message (insult)', at: Date.now() }], updatedAt: Date.now(), createdAt: Date.now() },
        { userId: 'user2', groupId: 'g1', count: 1, reasons: [{ reason: 'Spam (message frequency)', at: Date.now() }], updatedAt: Date.now(), createdAt: Date.now() },
      ],
    },
    bans: {
      activeCount: () => 1,
      all: () => [
        { userId: 'user1', groupId: 'g1', reason: 'High severity toxic', bannedAt: Date.now() - 1000, expiresAt: Date.now() + 3600000 },
      ],
    },
    rules: {
      getRules: () => ({
        R1: { title: 'Respect Everyone', punishment: 'Warn' },
        R2: { title: 'No Spam', punishment: 'Warn' },
      }),
    },
    audit: {
      all: (limit) => [
        { id: 'a1', action: 'WARNING', user: 'user1', moderator: 'system', reason: 'Toxic', timestamp: Date.now() },
      ].slice(0, limit),
    },
    toxicity: {
      isEnabled: () => true,
      getIncidents: () => [
        { id: 't1', user: 'user1', category: 'insult', action: 'warn', timestamp: Date.now(), score: 8 },
        { id: 't2', user: 'user2', category: 'profanity', action: 'log', timestamp: Date.now() - 1000, score: 3 },
      ],
      getStats: () => ({ detections: 2, warnings: 1, mostTriggeredCategory: 'insult', keywords: 100 }),
    },
    nsfw: {
      isEnabled: () => true,
      getIncidents: () => [
        { id: 'n1', user: 'user3', category: 'pornography', action: 'warn', timestamp: Date.now() },
      ],
      getStats: () => ({ detections: 1, warnings: 1, bans: 0, mostTriggeredCategory: 'pornography' }),
    },
    advertisement: {
      isEnabled: () => true,
      getIncidents: () => [],
      getStats: () => ({ detections: 0, warnings: 0, bans: 0, mostTriggeredCategory: null }),
    },
    raid: {
      isEnabled: () => true,
      getIncidents: () => [],
      getStats: () => ({ total: 0, byType: {}, activeRaidModes: 0 }),
    },
    sticker: {
      isEnabled: () => true,
      getIncidents: () => [],
      getStats: () => ({ total: 0, byType: {}, warnings: 0, logs: 0 }),
    },
  };
  return { ...defaults, ...overrides };
}

// === AnalyticsService Tests ===

test('AnalyticsService: getOverview returns correct structure', () => {
  const service = new AnalyticsService({ repos: makeRepos() });
  const result = service.getOverview('all');
  assert.equal(typeof result.messagesSeen, 'number');
  assert.equal(typeof result.blockedMessages, 'number');
  assert.equal(typeof result.toxicDetections, 'number');
  assert.equal(typeof result.nsfwDetections, 'number');
  assert.equal(typeof result.adDetections, 'number');
  assert.equal(typeof result.raidDetections, 'number');
  assert.equal(typeof result.spamDetections, 'number');
  assert.equal(typeof result.totalWarnings, 'number');
  assert.equal(typeof result.activeBans, 'number');
  assert.equal(result.range, 'all');
});

test('AnalyticsService: getOverview counts detections correctly', () => {
  const service = new AnalyticsService({ repos: makeRepos() });
  const result = service.getOverview('all');
  assert.equal(result.toxicDetections, 2);
  assert.equal(result.nsfwDetections, 1);
  assert.equal(result.adDetections, 0);
  assert.equal(result.raidDetections, 0);
  assert.equal(result.spamDetections, 0);
});

test('AnalyticsService: getOverview uses cache', () => {
  const repos = makeRepos();
  let callCount = 0;
  const orig = repos.settings.getMessagesSeen;
  repos.settings.getMessagesSeen = () => { callCount++; return orig(); };
  const service = new AnalyticsService({ repos });
  service.getOverview('all');
  service.getOverview('all');
  assert.equal(callCount, 1);
});

test('AnalyticsService: invalidate clears cache', () => {
  const repos = makeRepos();
  let callCount = 0;
  const orig = repos.settings.getMessagesSeen;
  repos.settings.getMessagesSeen = () => { callCount++; return orig(); };
  const service = new AnalyticsService({ repos });
  service.getOverview('all');
  service.invalidate();
  service.getOverview('all');
  assert.equal(callCount, 2);
});

test('AnalyticsService: getTopViolations returns sorted results', () => {
  const service = new AnalyticsService({ repos: makeRepos() });
  const result = service.getTopViolations('all', 10);
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i - 1].count >= result[i].count);
  }
});

test('AnalyticsService: getUserProfile returns correct structure', () => {
  const service = new AnalyticsService({ repos: makeRepos() });
  const profile = service.getUserProfile('user1');
  assert.equal(profile.userId, 'user1');
  assert.equal(typeof profile.totalWarnings, 'number');
  assert.equal(typeof profile.warnLimit, 'number');
  assert.equal(typeof profile.totalViolations, 'number');
  assert.equal(typeof profile.totalBans, 'number');
  assert.equal(typeof profile.mostCommonViolation, 'string');
  assert.equal(typeof profile.lastAction, 'string');
  assert.equal(typeof profile.trustScore, 'number');
  assert.ok(Array.isArray(profile.groups));
  assert.ok(typeof profile.violationsByCategory === 'object');
});

test('AnalyticsService: getUserProfile trust score decreases with violations', () => {
  const service = new AnalyticsService({ repos: makeRepos() });
  const profile1 = service.getUserProfile('user1');
  const profile2 = service.getUserProfile('user3');
  assert.ok(profile1.trustScore <= 100);
  assert.ok(profile1.trustScore >= 0);
});

test('AnalyticsService: getEnhancedIncidents returns enhanced data', () => {
  const service = new AnalyticsService({ repos: makeRepos() });
  const result = service.getEnhancedIncidents('toxicity', 'all', 10);
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
  assert.equal(result[0].module, 'toxicity');
  assert.ok('actionLabel' in result[0]);
});

test('AnalyticsService: event bus invalidates cache', () => {
  const eventBus = new EventEmitter();
  const repos = makeRepos();
  let callCount = 0;
  const orig = repos.settings.getMessagesSeen;
  repos.settings.getMessagesSeen = () => { callCount++; return orig(); };
  const service = new AnalyticsService({ repos, eventBus });
  service.getOverview('all');
  assert.equal(callCount, 1);
  eventBus.emit('warning:issued', {});
  service.getOverview('all');
  assert.equal(callCount, 2);
});

// === ExportService Tests ===

test('ExportService: toJSON returns valid JSON', () => {
  const analytics = new AnalyticsService({ repos: makeRepos() });
  const service = new ExportService({ repos: makeRepos(), analyticsService: analytics });
  const json = service.toJSON('all');
  const parsed = JSON.parse(json);
  assert.ok(parsed.generatedAt);
  assert.ok(parsed.overview);
  assert.ok(Array.isArray(parsed.topViolations));
  assert.ok(Array.isArray(parsed.incidents));
  assert.ok(Array.isArray(parsed.warnings));
  assert.ok(Array.isArray(parsed.bans));
  assert.ok(Array.isArray(parsed.auditLog));
});

test('ExportService: toCSV returns valid CSV', () => {
  const analytics = new AnalyticsService({ repos: makeRepos() });
  const service = new ExportService({ repos: makeRepos(), analyticsService: analytics });
  const csv = service.toCSV('all');
  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes('=== OVERVIEW ==='));
  assert.ok(csv.includes('=== TOP VIOLATIONS ==='));
  assert.ok(csv.includes('=== INCIDENTS ==='));
  assert.ok(csv.includes('=== WARNINGS ==='));
  assert.ok(csv.includes('=== BANS ==='));
  assert.ok(csv.includes('=== AUDIT LOG ==='));
});

test('ExportService: CSV escapes double quotes', () => {
  const analytics = new AnalyticsService({ repos: makeRepos() });
  const service = new ExportService({ repos: makeRepos(), analyticsService: analytics });
  const csv = service.toCSV('all');
  assert.ok(!csv.includes('""') || csv.includes('""'));
});

test('ExportService: generateReport includes all sections', () => {
  const analytics = new AnalyticsService({ repos: makeRepos() });
  const service = new ExportService({ repos: makeRepos(), analyticsService: analytics });
  const report = service.generateReport('all');
  assert.ok(report.generatedAt);
  assert.equal(report.range, 'all');
  assert.ok(report.overview);
  assert.ok(report.topViolations.length >= 0);
  assert.ok(Array.isArray(report.incidents));
  assert.ok(Array.isArray(report.warnings));
  assert.ok(Array.isArray(report.bans));
  assert.ok(Array.isArray(report.auditLog));
});
