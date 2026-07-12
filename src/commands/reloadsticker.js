/**
 * !reloadsticker — reload data/sticker.json at runtime (thresholds, enable
 * flag) without restarting the bot. Admin only.
 */

export default {
  name: 'reloadsticker',
  description: 'Reload data/sticker.json without restarting the bot.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    await ctx.repos.sticker.reload();
    ctx.services.sticker.reload();
    await ctx.message.reply('💠 Sticker configuration reloaded.');
  },
};
