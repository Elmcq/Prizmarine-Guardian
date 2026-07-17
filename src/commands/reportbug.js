import { errorText, successText, panelText } from './messages.js';

const DIVIDER = '━━━━━━━━━━━━━━';

export default {
  name: 'reportbug',
  description: 'Report a bug, false positive, or unexpected bot behavior.',
  adminOnly: false,
  usage: '<title> | <description> | <example> | <expected> | <actual>',
  async run(ctx) {
    const text = ctx.args.join(' ').trim();

    if (!text) {
      const form = [
        '🐞 *Bug Report Form*',
        '',
        DIVIDER,
        'To report a bug, use this format:',
        '',
        `${ctx.config.prefix}reportbug <title> | <description> | <example> | <expected> | <actual>`,
        '',
        'Example:',
        `${ctx.config.prefix}reportbug False Positive | Bot detects animal discussion as toxic | "Anjing hewan lucu" | IGNORE | WARNING`,
        '',
        'Fields:',
        '• Title: Short bug name',
        '• Description: What went wrong',
        '• Example: The message that triggered the bug (optional)',
        '• Expected: What should have happened (optional)',
        '• Actual: What actually happened (optional)',
        DIVIDER,
      ];
      return ctx.message.reply(form.join('\n'));
    }

    const parts = text.split('|').map(s => s.trim());
    const [title, description, example, expected, actual] = parts;

    if (!title || !description) {
      return ctx.message.reply(errorText('Missing required fields.', 'Provide at least: title | description'));
    }

    const report = await ctx.services.bugReport.createReport({
      reporterId: ctx.authorId,
      reporterName: ctx.authorName || ctx.authorId,
      title,
      description,
      example: example || '',
      expected: expected || '',
      actual: actual || '',
    });

    const pad = (n) => String(n).padStart(3, '0');
    const response = [
      '🐞 *Bug Report Submitted*',
      '',
      DIVIDER,
      `Report: #${pad(report.id)}`,
      `Status: 🟢 Open`,
      `Priority: 🟡 Medium`,
      '',
      `Reporter: @${report.reporterName}`,
      `Title: ${report.title}`,
      '',
      `Description:`,
      report.description,
      '',
      DIVIDER,
      'Thank you for your report! An admin will review it soon.',
      `Check status with: ${ctx.config.prefix}bugstatus ${pad(report.id)}`,
      DIVIDER,
    ];

    await ctx.message.reply(response.join('\n'));
  },
};
