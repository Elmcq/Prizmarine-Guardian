/**
 * !addrule R8 | Rule Title | Rule Description | Punishment
 * Create a new community rule. Owner only.
 *
 * The command body is split on " | " so titles/descriptions may contain
 * spaces. Everything is validated by RuleService (no duplicate ids, no empty
 * fields, only the supported punishments).
 */

import { ruleAddedText, usageText } from '../utils/formatter.js';

const OWNER_ONLY = '🚫 This command is owner-only.';

export default {
  name: 'addrule',
  description: 'Add a new community rule (owner only).',
  adminOnly: true,
  usage: 'R8 | Rule Title | Rule Description | Punishment',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.services.permission.isOwner(ctx.authorId)) {
      return ctx.message.reply(OWNER_ONLY);
    }

    const raw = (ctx.args || []).join(' ').trim();
    if (!raw) {
      return ctx.message.reply(
        usageText(ctx.config.prefix, 'addrule', 'R8 | Rule Title | Rule Description | Punishment'),
      );
    }

    const parts = raw.split(/\s*\|\s*/).map((s) => s.trim());
    const [id, title, description] = parts;
    const punishment = (parts[3] || 'Warn').trim();

    try {
      const rule = await ctx.services.rule.addRule(
        { id, title, description, punishment },
        ctx.authorId,
      );
      await ctx.message.reply(ruleAddedText({ id: rule.id, rule }));
    } catch (err) {
      await ctx.message.reply(`⚠️ ${err.message}`);
    }
  },
};
