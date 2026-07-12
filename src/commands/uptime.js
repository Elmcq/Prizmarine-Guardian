/**
 * !uptime — show how long the bot has been running. Admin only.
 */

import { humanizeDuration } from '../utils/time.js';

export default {
  name: 'uptime',
  description: 'Show bot uptime.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const uptimeMs = Date.now() - ctx.services.health.startTime;
    await ctx.message.reply(`⏱️ *Uptime:* ${humanizeDuration(uptimeMs)}`);
  },
};
