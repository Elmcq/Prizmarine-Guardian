/**
 * !rules — display every community rule. Available to all members.
 * Reuses RuleService (which loads rules dynamically from data/rules.json).
 */

import { ruleListText } from '../utils/formatter.js';

export default {
  name: 'rules',
  description: 'Show all community rules.',
  adminOnly: false,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const rules = ctx.services.rule.listRules();
    await ctx.message.reply(ruleListText({ botName: ctx.config.botName, rules }));
  },
};
