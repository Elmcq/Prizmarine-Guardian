/**
 * !stickerstatus — show Anti Sticker Spam configuration and recent incidents.
 * Admin only.
 */

export default {
  name: 'stickerstatus',
  description: 'Show Anti Sticker Spam configuration and recent incidents.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const s = ctx.repos.sticker.getSettings();
    const stats = ctx.repos.sticker.getStats();
    const recent = ctx.repos.sticker.getIncidents().slice(-10).reverse();

    const lines = [
      `💠 *${ctx.config.botName} — Anti Sticker*`,
      '',
      `Enabled: ${s.enabled ? 'yes' : 'no'}`,
      `Sticker flood: ${s.maxStickers} stickers / ${s.timeWindow}s`,
      `Duplicate limit: ${s.duplicateLimit} identical in a row`,
      `Warn limit: ${s.warnLimit}`,
      `Coordinated (log only): ${s.coordinated.minUsers} users / ${s.coordinated.windowSec}s`,
      '',
      `Total incidents: ${stats.total}`,
      `Warnings issued: ${stats.warnings}`,
      `Log-only events: ${stats.logs}`,
      '',
      'Recent incidents:',
    ];
    if (!recent.length) {
      lines.push('• none');
    } else {
      for (const i of recent) {
        lines.push(`• ${i.type} @ ${i.group || '?'} (${i.action || 'log'})`);
      }
    }

    await ctx.message.reply(lines.join('\n'));
  },
};
