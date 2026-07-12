/**
 * !rule R2 — show the full detail of one rule. Admin only.
 * Reuses RuleService.
 */

import { ruleDetailText, usageText } from '../utils/formatter.js';

export default {
  name: 'rule',
  description: 'Show the full detail of one rule (e.g. !rule R2).',
  adminOnly: true,
  usage: '<ruleId>',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const id = (ctx.args[0] || '').trim();
    if (!id) {
      return ctx.message.reply(usageText(ctx.config.prefix, 'rule', '<ruleId>'));
    }
    const rule = ctx.services.rule.getRule(id);
    if (!rule) {
      return ctx.message.reply(`ℹ️ Rule "${id}" not found.`);
    }
    await ctx.message.reply(ruleDetailText({ rule }));
  },
};
