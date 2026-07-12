/**
 * !warnings — list all current warning records. Admin only.
 */

import { mentionToken } from '../utils/mentions.js';

export default {
  name: 'warnings',
  description: 'Show all stored warnings.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const records = ctx.repos.warnings.all();
    if (!records.length) {
      return ctx.message.reply('📭 No warnings stored.');
    }
    const lines = records.slice(0, 50).map((r) => {
      const who = mentionToken(r.userId);
      const grp = r.groupId.split('@')[0].slice(-6);
      return `• ${who} — ${r.count} warn(s) [grp …${grp}]`;
    });
    if (records.length > 50) lines.push(`…and ${records.length - 50} more.`);
    await ctx.message.reply(`📋 *Warnings (${records.length})*\n\n${lines.join('\n')}`);
  },
};
