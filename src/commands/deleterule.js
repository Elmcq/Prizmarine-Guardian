/**
 * !deleterule R8 — remove a rule. Owner only.
 */

import { ruleDeletedText, usageText } from '../utils/formatter.js';

const OWNER_ONLY = '🚫 This command is owner-only.';

export default {
  name: 'deleterule',
  description: 'Delete a community rule (owner only).',
  adminOnly: true,
  usage: '<ruleId>',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.services.permission.isOwner(ctx.authorId)) {
      return ctx.message.reply(OWNER_ONLY);
    }

    const id = (ctx.args[0] || '').trim();
    if (!id) {
      return ctx.message.reply(usageText(ctx.config.prefix, 'deleterule', '<ruleId>'));
    }

    try {
      await ctx.services.rule.deleteRule(id, ctx.authorId);
      await ctx.message.reply(ruleDeletedText({ id }));
    } catch (err) {
      await ctx.message.reply(`⚠️ ${err.message}`);
    }
  },
};
