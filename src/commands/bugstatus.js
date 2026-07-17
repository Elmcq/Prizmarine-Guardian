import { errorText, successText, usageText } from './messages.js';

const VALID_STATUSES = ['open', 'investigating', 'fixing', 'testing', 'released', 'closed'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUS_EMOJI = {
  open: '🟢', investigating: '🔍', fixing: '🛠',
  testing: '🧪', released: '🚀', closed: '🔴',
};

export default {
  name: 'bugstatus',
  description: 'View or update a bug report status (admin only).',
  adminOnly: true,
  usage: '<id> [status|priority] [value]',
  async run(ctx) {
    const [idStr, field, value] = ctx.args;

    if (!idStr) {
      return ctx.message.reply(usageText(ctx.config.prefix, 'bugstatus', '<id> [status|priority] [value]'));
    }

    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return ctx.message.reply(errorText('Invalid report ID.', 'Provide a numeric ID.'));
    }

    const report = ctx.services.bugReport.getReport(id);
    if (!report) {
      return ctx.message.reply(errorText(`Bug report #${String(id).padStart(3, '0')} not found.`, 'Use !bugs to see all reports.'));
    }

    // View mode: no field specified
    if (!field) {
      return ctx.message.reply(ctx.services.bugReport.formatReport(report));
    }

    // Update mode
    const fieldLower = field.toLowerCase();
    const valueLower = (value || '').toLowerCase();

    if (fieldLower === 'status') {
      if (!valueLower || !VALID_STATUSES.includes(valueLower)) {
        return ctx.message.reply(errorText('Invalid status.', `Valid: ${VALID_STATUSES.join(', ')}`));
      }
      const updated = await ctx.services.bugReport.updateStatus(id, valueLower);
      const emoji = STATUS_EMOJI[updated.status];
      return ctx.message.reply(successText(
        `Bug Report #${String(id).padStart(3, '0')} Updated`,
        `${emoji} ${updated.status.charAt(0).toUpperCase() + updated.status.slice(1)}`,
        `Status changed to: ${updated.status}`,
      ));
    }

    if (fieldLower === 'priority') {
      if (!valueLower || !VALID_PRIORITIES.includes(valueLower)) {
        return ctx.message.reply(errorText('Invalid priority.', `Valid: ${VALID_PRIORITIES.join(', ')}`));
      }
      const updated = await ctx.services.bugReport.updatePriority(id, valueLower);
      return ctx.message.reply(successText(
        `Bug Report #${String(id).padStart(3, '0')} Updated`,
        `Priority: ${updated.priority.charAt(0).toUpperCase() + updated.priority.slice(1)}`,
        `Priority changed to: ${updated.priority}`,
      ));
    }

    return ctx.message.reply(errorText('Invalid field.', `Use "status" or "priority".`));
  },
};
