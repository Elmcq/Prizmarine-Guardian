/**
 * !antiraid on|off — enable or disable the Anti Raid module. Admin only.
 */

import { usageText } from '../utils/formatter.js';

export default {
  name: 'antiraid',
  description: 'Enable or disable the Anti Raid module.',
  adminOnly: true,
  usage: 'on|off',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      return ctx.message.reply(usageText(ctx.config.prefix, 'antiraid', 'on|off'));
    }
    const enabled = arg === 'on';
    await ctx.repos.raid.setEnabled(enabled);
    ctx.services.raid.reload();
    await ctx.message.reply(`🚨 Anti-Raid module ${enabled ? 'enabled' : 'disabled'}.`);
  },
};
