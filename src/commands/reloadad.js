/**
 * !reloadad — reload data/advertisement.json at runtime (categories,
 * exemptions, limits, enable flag) without restarting the bot. Admin only.
 */

export default {
  name: 'reloadad',
  description: 'Reload data/advertisement.json without restarting the bot.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    await ctx.repos.advertisement.reload();
    ctx.services.advertisement.reload();
    await ctx.message.reply('🔄 Advertisement configuration reloaded.');
  },
};
