/**
 * !reloadnsfw — reload data/nsfw.json at runtime (categories, limits,
 * enable flag) without restarting the bot. Admin only.
 */

export default {
  name: 'reloadnsfw',
  description: 'Reload data/nsfw.json without restarting the bot.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    await ctx.repos.nsfw.reload();
    ctx.services.nsfw.reload();
    await ctx.message.reply('🔄 NSFW configuration reloaded.');
  },
};
