/**
 * !raidmode on|off — manually enable or disable Raid Mode for the current
 * group. Admin only. Works regardless of the automatic thresholds (useful to
 * lock down a group you can see is being raided).
 */

import { usageText } from '../utils/formatter.js';

export default {
  name: 'raidmode',
  description: 'Manually enable or disable Raid Mode for this group.',
  adminOnly: true,
  usage: 'on|off',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (arg !== 'on' && arg !== 'off') {
      return ctx.message.reply(usageText(ctx.config.prefix, 'raidmode', 'on|off'));
    }
    if (!ctx.groupId) {
      return ctx.message.reply('⚠️ Raid Mode can only be toggled inside a group.');
    }
    const active = arg === 'on';
    await ctx.services.raid.setRaidMode(ctx.groupId, active);
    await ctx.message.reply(
      active
        ? '🚨 Raid Mode is now *ACTIVE* for this group. Moderation sensitivity is increased.'
        : '🚨 Raid Mode is now *OFF* for this group.',
    );
  },
};
