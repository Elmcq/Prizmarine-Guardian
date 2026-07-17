/**
 * @file BugReportRepository — reads/writes bug reports stored in
 * data/bugreports.json (managed by DatabaseService).
 */

const VALID_STATUSES = ['open', 'investigating', 'fixing', 'testing', 'released', 'closed'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export class BugReportRepository {
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.bugreports;
  }

  getReports() {
    if (!Array.isArray(this.db.data.reports)) this.db.data.reports = [];
    return this.db.data.reports;
  }

  getReportById(id) {
    return this.getReports().find(r => r.id === id) || null;
  }

  getNextId() {
    const reports = this.getReports();
    if (reports.length === 0) return 1;
    return Math.max(...reports.map(r => r.id)) + 1;
  }

  async createReport({ reporterId, reporterName, title, description, example, expected, actual }) {
    const now = Date.now();
    const report = {
      id: this.getNextId(),
      reporterId,
      reporterName: reporterName || reporterId,
      title,
      description,
      example: example || '',
      expected: expected || '',
      actual: actual || '',
      status: 'open',
      priority: 'medium',
      contributorCredit: '',
      created: now,
      updated: now,
    };
    this.getReports().push(report);
    await this.dbService.persist(this.db);
    return report;
  }

  async updateReport(id, patch) {
    const report = this.getReportById(id);
    if (!report) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) report[key] = value;
    }
    report.updated = Date.now();
    await this.dbService.persist(this.db);
    return report;
  }

  async updateStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) return null;
    return this.updateReport(id, { status });
  }

  async updatePriority(id, priority) {
    if (!VALID_PRIORITIES.includes(priority)) return null;
    return this.updateReport(id, { priority });
  }

  async addContributorCredit(id, credit) {
    return this.updateReport(id, { contributorCredit: credit });
  }

  getStats() {
    const reports = this.getReports();
    const byStatus = {};
    const byPriority = {};
    for (const r of reports) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    }
    return { total: reports.length, byStatus, byPriority };
  }

  getOpenReports() {
    return this.getReports().filter(r => r.status !== 'closed' && r.status !== 'released');
  }

  async reload() {
    await this.dbService.bugreports.read();
    return this.getReports();
  }
}

export default BugReportRepository;
