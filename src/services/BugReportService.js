/**
 * @file BugReportService — business logic for the bug report system.
 */

const STATUS_EMOJI = {
  open: '🟢',
  investigating: '🔍',
  fixing: '🛠',
  testing: '🧪',
  released: '🚀',
  closed: '🔴',
};

const PRIORITY_EMOJI = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

export class BugReportService {
  constructor({ repo, logger }) {
    this.repo = repo;
    this.logger = logger;
  }

  createReport({ reporterId, reporterName, title, description, example, expected, actual }) {
    const report = this.repo.createReport({
      reporterId,
      reporterName,
      title,
      description,
      example,
      expected,
      actual,
    });
    this.logger.info('Bug report created', { id: report.id, reporter: reporterName, title });
    return report;
  }

  getReport(id) {
    return this.repo.getReportById(id);
  }

  getAllReports() {
    return this.repo.getReports();
  }

  getOpenReports() {
    return this.repo.getOpenReports();
  }

  async updateStatus(id, status) {
    const report = await this.repo.updateStatus(id, status);
    if (report) {
      this.logger.info('Bug report status updated', { id: report.id, status });
    }
    return report;
  }

  async updatePriority(id, priority) {
    const report = await this.repo.updatePriority(id, priority);
    if (report) {
      this.logger.info('Bug report priority updated', { id: report.id, priority });
    }
    return report;
  }

  async addContributorCredit(id, credit) {
    const report = await this.repo.addContributorCredit(id, credit);
    if (report) {
      this.logger.info('Bug report contributor credit added', { id: report.id, credit });
    }
    return report;
  }

  formatReport(report) {
    const statusEmoji = STATUS_EMOJI[report.status] || '⚪';
    const priorityEmoji = PRIORITY_EMOJI[report.priority] || '⚪';
    const pad = (n) => String(n).padStart(3, '0');
    let text = `🐞 Bug Report #${pad(report.id)}\n\n`;
    text += `Status: ${statusEmoji} ${report.status.charAt(0).toUpperCase() + report.status.slice(1)}\n`;
    text += `Priority: ${priorityEmoji} ${report.priority.charAt(0).toUpperCase() + report.priority.slice(1)}\n\n`;
    text += `Reporter: @${report.reporterName}\n`;
    text += `Title: ${report.title}\n\n`;
    text += `Description:\n${report.description}\n`;
    if (report.example) text += `\nExample:\n"${report.example}"\n`;
    if (report.expected) text += `\nExpected: ${report.expected}\n`;
    if (report.actual) text += `Actual: ${report.actual}\n`;
    if (report.contributorCredit) text += `\nSpecial Thanks: ${report.contributorCredit}\n`;
    text += `\nCreated: ${new Date(report.created).toLocaleString()}\n`;
    text += `Updated: ${new Date(report.updated).toLocaleString()}`;
    return text;
  }

  formatReportList(reports) {
    if (reports.length === 0) return '🐞 No bug reports found.';
    const pad = (n) => String(n).padStart(3, '0');
    let text = `🐞 Bug Reports (${reports.length})\n\n`;
    for (const r of reports) {
      const statusEmoji = STATUS_EMOJI[r.status] || '⚪';
      text += `#${pad(r.id)} ${r.title}\n`;
      text += `  Status: ${statusEmoji} ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}\n`;
      text += `  Reporter: @${r.reporterName}\n\n`;
    }
    return text.trim();
  }

  getStats() {
    return this.repo.getStats();
  }
}

export default BugReportService;
