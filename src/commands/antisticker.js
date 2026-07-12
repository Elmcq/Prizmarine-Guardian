/**
 * !antisticker on|off — enable or disable the Anti Sticker Spam module. Admin only.
 */

import { usageText } from '../utils/formatter.js';

export default {
  name: 'antisticker',
  description: 'Enable or disable the Anti Sticker Spam module.',
  adminOnly: true,
  usage: 'on|off',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      return ctx.message.reply(usageText(ctx.config.prefix, 'antisticker', 'on|off'));
    }
    const enabled = arg === 'on';
    await ctx.repos.sticker.setEnabled(enabled);
    ctx.services.sticker.reload();
    await ctx.message.reply(`💠 Anti-Sticker module ${enabled ? 'enabled' : 'disabled'}.`);
  },
};
