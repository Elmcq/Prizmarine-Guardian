import { panelText } from './messages.js';

const DIVIDER = '━━━━━━━━━━━━━━';

export default {
  name: 'bugs',
  description: 'List all bug reports (admin only).',
  adminOnly: true,
  usage: '[status]',
  async run(ctx) {
    const statusFilter = (ctx.args[0] || '').toLowerCase();
    let reports = ctx.services.bugReport.getAllReports();

    if (statusFilter) {
      reports = reports.filter(r => r.status === statusFilter);
    }

    if (reports.length === 0) {
      return ctx.message.reply('🐞 No bug reports found.');
    }

    const pad = (n) => String(n).padStart(3, '0');
    const STATUS_EMOJI = {
      open: '🟢', investigating: '🔍', fixing: '🛠',
      testing: '🧪', released: '🚀', closed: '🔴',
    };

    const lines = [`Found: ${reports.length} report(s)`, ''];
    for (const r of reports) {
      const emoji = STATUS_EMOJI[r.status] || '⚪';
      lines.push(`#${pad(r.id)} ${r.title}`);
      lines.push(`  Status: ${emoji} ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}`);
      lines.push(`  Reporter: @${r.reporterName}`);
      lines.push('');
    }

    await ctx.message.reply(panelText('Bug Reports', lines, '🐞'));
  },
};
