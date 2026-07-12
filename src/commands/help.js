/**
 * !help — list all commands (filtered by the caller's permissions).
 */

export default {
  name: 'help',
  description: 'Show all available commands.',
  adminOnly: false,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const isAdmin = ctx.isAdmin || ctx.isOwner;
    const list = ctx.commandRegistry;
    const lines = ['📖 *Available Commands*', ''];
    for (const cmd of list.values()) {
      if (cmd.adminOnly && !isAdmin) continue;
      const usage = cmd.usage ? ` ${cmd.usage}` : '';
      lines.push(`*${ctx.config.prefix}${cmd.name}${usage}* — ${cmd.description}`);
    }
    lines.push('', 'Admin commands require group-admin rights (owner is always allowed).');
    await ctx.message.reply(lines.join('\n'));
  },
};
