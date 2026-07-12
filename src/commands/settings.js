/**
 * !settings — show the current bot configuration. Admin only.
 */

import { humanizeDuration } from '../utils/time.js';

export default {
  name: 'settings',
  description: 'Show the current configuration.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const c = ctx.config;
    const lines = [
      `🤖 *${c.botName}*`,
      '',
      `Prefix: \`${c.prefix}\``,
      `Owner: ${c.owner}`,
      `Warn limit: ${c.warnLimit}`,
      `Ban duration: ${humanizeDuration(c.banDuration)}`,
      `Anti-spam: ${c.spamCount} msgs / ${humanizeDuration(c.spamWindow)}`,
      `Anti-flood: ${c.floodCount} identical msgs`,
      `Log level: ${c.logLevel}`,
    ];
    await ctx.message.reply(lines.join('\n'));
  },
};
