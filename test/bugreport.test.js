import test from 'node:test';
import assert from 'node:assert/strict';
import { BugReportRepository } from '../src/database/repositories/BugReportRepository.js';
import { BugReportService } from '../src/services/BugReportService.js';

function createMockDb() {
 return {
  bugreports: {
   data: { reports: [] },
   read: async () => {},
   write: async () => {},
  },
 };
}

function createMockDbService() {
 const db = createMockDb();
 return {
  db,
  persist: async () => {},
  uuid: () => 'test-uuid',
  get bugreports() { return db.bugreports; },
 };
}

// === Repository Tests ===

test('BugReportRepository: create report assigns incrementing ID', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 const r1 = await repo.createReport({
  reporterId: 'user1',
  reporterName: 'Alice',
  title: 'Test bug 1',
  description: 'Description 1',
 });

 assert.equal(r1.id, 1);
 assert.equal(r1.reporterId, 'user1');
 assert.equal(r1.reporterName, 'Alice');
 assert.equal(r1.title, 'Test bug 1');
 assert.equal(r1.status, 'open');
 assert.equal(r1.priority, 'medium');
 assert.equal(typeof r1.created, 'number');
 assert.equal(typeof r1.updated, 'number');
});

test('BugReportRepository: create multiple reports with incrementing IDs', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 const r1 = await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug 1', description: 'D1' });
 const r2 = await repo.createReport({ reporterId: 'u2', reporterName: 'B', title: 'Bug 2', description: 'D2' });
 const r3 = await repo.createReport({ reporterId: 'u3', reporterName: 'C', title: 'Bug 3', description: 'D3' });

 assert.equal(r1.id, 1);
 assert.equal(r2.id, 2);
 assert.equal(r3.id, 3);
});

test('BugReportRepository: getReportById returns correct report', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'Desc' });
 const found = repo.getReportById(1);

 assert.equal(found.title, 'Bug');
 assert.equal(found.reporterName, 'A');
});

test('BugReportRepository: getReportById returns null for missing', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 assert.equal(repo.getReportById(999), null);
});

test('BugReportRepository: updateStatus changes status', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'Desc' });
 const updated = await repo.updateStatus(1, 'investigating');

 assert.equal(updated.status, 'investigating');
 assert.ok(updated.updated >= updated.created);
});

test('BugReportRepository: updateStatus rejects invalid status', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'Desc' });
 const result = await repo.updateStatus(1, 'invalid');

 assert.equal(result, null);
});

test('BugReportRepository: updatePriority changes priority', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'Desc' });
 const updated = await repo.updatePriority(1, 'critical');

 assert.equal(updated.priority, 'critical');
});

test('BugReportRepository: updatePriority rejects invalid priority', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'Desc' });
 const result = await repo.updatePriority(1, 'invalid');

 assert.equal(result, null);
});

test('BugReportRepository: addContributorCredit', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'Desc' });
 const updated = await repo.addContributorCredit(1, '@Altan — QA testing');

 assert.equal(updated.contributorCredit, '@Altan — QA testing');
});

test('BugReportRepository: getStats counts by status and priority', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug 1', description: 'D1' });
 await repo.createReport({ reporterId: 'u2', reporterName: 'B', title: 'Bug 2', description: 'D2' });
 await repo.updateStatus(2, 'closed');

 const stats = repo.getStats();
 assert.equal(stats.total, 2);
 assert.equal(stats.byStatus.open, 1);
 assert.equal(stats.byStatus.closed, 1);
 assert.equal(stats.byPriority.medium, 2);
});

test('BugReportRepository: getOpenReports excludes closed/released', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);

 await repo.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug 1', description: 'D1' });
 await repo.createReport({ reporterId: 'u2', reporterName: 'B', title: 'Bug 2', description: 'D2' });
 await repo.createReport({ reporterId: 'u3', reporterName: 'C', title: 'Bug 3', description: 'D3' });
 await repo.updateStatus(2, 'investigating');
 await repo.updateStatus(3, 'closed');

 const open = repo.getOpenReports();
 assert.equal(open.length, 2);
 assert.ok(open.every(r => r.status !== 'closed' && r.status !== 'released'));
});

// === Service Tests ===

test('BugReportService: createReport returns formatted report', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 const report = await service.createReport({
  reporterId: 'user1',
  reporterName: 'Alice',
  title: 'Test Bug',
  description: 'Something is broken',
  example: 'test message',
  expected: 'Should work',
  actual: 'Does not work',
 });

 assert.equal(report.id, 1);
 assert.equal(report.title, 'Test Bug');
 assert.equal(report.example, 'test message');
});

test('BugReportService: formatReport produces readable text', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 const report = await service.createReport({
  reporterId: 'user1',
  reporterName: 'Alice',
  title: 'False Positive',
  description: 'Bot detects animal discussion',
  example: 'Anjing hewan lucu',
  expected: 'IGNORE',
  actual: 'WARNING',
 });

 const formatted = service.formatReport(report);
 assert.ok(formatted.includes('#001'));
 assert.ok(formatted.includes('False Positive'));
 assert.ok(formatted.includes('Alice'));
 assert.ok(formatted.includes('🟢 Open'));
 assert.ok(formatted.includes('IGNORE'));
});

test('BugReportService: formatReportList produces readable text', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 await service.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug 1', description: 'D1' });
 await service.createReport({ reporterId: 'u2', reporterName: 'B', title: 'Bug 2', description: 'D2' });

 const reports = service.getAllReports();
 const formatted = service.formatReportList(reports);
 assert.ok(formatted.includes('#001'));
 assert.ok(formatted.includes('#002'));
 assert.ok(formatted.includes('2'));
});

test('BugReportService: formatReportList returns message when empty', () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 const formatted = service.formatReportList([]);
 assert.ok(formatted.includes('No bug reports'));
});

test('BugReportService: updateStatus works', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 await service.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'D' });
 const updated = await service.updateStatus(1, 'fixing');

 assert.equal(updated.status, 'fixing');
});

test('BugReportService: updatePriority works', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 await service.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'D' });
 const updated = await service.updatePriority(1, 'high');

 assert.equal(updated.priority, 'high');
});

test('BugReportService: addContributorCredit works', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 await service.createReport({ reporterId: 'u1', reporterName: 'A', title: 'Bug', description: 'D' });
 const updated = await service.addContributorCredit(1, '@Altan');

 assert.equal(updated.contributorCredit, '@Altan');
});

// === Lifecycle Test ===

test('BugReportService: full lifecycle (open -> investigating -> fixing -> testing -> released -> closed)', async () => {
 const dbService = createMockDbService();
 const repo = new BugReportRepository(dbService);
 const service = new BugReportService({ repo, logger: { info: () => {}, debug: () => {} } });

 await service.createReport({ reporterId: 'u1', reporterName: 'Alice', title: 'Lifecycle', description: 'Test lifecycle' });

 let report = service.getReport(1);
 assert.equal(report.status, 'open');

 await service.updateStatus(1, 'investigating');
 report = service.getReport(1);
 assert.equal(report.status, 'investigating');

 await service.updateStatus(1, 'fixing');
 report = service.getReport(1);
 assert.equal(report.status, 'fixing');

 await service.updateStatus(1, 'testing');
 report = service.getReport(1);
 assert.equal(report.status, 'testing');

 await service.updateStatus(1, 'released');
 report = service.getReport(1);
 assert.equal(report.status, 'released');

 await service.updateStatus(1, 'closed');
 report = service.getReport(1);
 assert.equal(report.status, 'closed');
});
