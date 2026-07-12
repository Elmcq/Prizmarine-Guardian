/**
 * !reloadraid — reload data/raid.json at runtime (thresholds, sensitivity,
 * enable flags, auto-raid) without restarting the bot. Admin only.
 */

export default {
  name: 'reloadraid',
  description: 'Reload data/raid.json without restarting the bot.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    await ctx.repos.raid.reload();
    ctx.services.raid.reload();
    await ctx.message.reply('🔄 Raid configuration reloaded.');
  },
};
