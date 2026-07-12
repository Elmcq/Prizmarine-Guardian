/**
 * !editrule R8 title New Title
 * !editrule R8 description Some description.
 * !editrule R8 punishment TempBan
 * Edit one field of a rule. Owner only.
 */

import { usageText } from '../utils/formatter.js';

const OWNER_ONLY = '🚫 This command is owner-only.';

export default {
  name: 'editrule',
  description: 'Edit a rule field: title, description or punishment (owner only).',
  adminOnly: true,
  usage: 'R8 <title|description|punishment> <new value>',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.services.permission.isOwner(ctx.authorId)) {
      return ctx.message.reply(OWNER_ONLY);
    }

    const [id, field, ...rest] = ctx.args;
    const value = rest.join(' ').trim();
    if (!id || !field || !value) {
      return ctx.message.reply(
        usageText(ctx.config.prefix, 'editrule', 'R8 <title|description|punishment> <new value>'),
      );
    }

    try {
      const res = await ctx.services.rule.editRule(id, field.toLowerCase(), value, ctx.authorId);
      if (res.unchanged) {
        return ctx.message.reply(`ℹ️ Rule ${res.id} ${res.field} is already "${res.new}".`);
      }
      await ctx.message.reply(
        `✅ Rule ${res.id} updated\n${res.field}: ${res.old} → ${res.new}`,
      );
    } catch (err) {
      await ctx.message.reply(`⚠️ ${err.message}`);
    }
  },
};
