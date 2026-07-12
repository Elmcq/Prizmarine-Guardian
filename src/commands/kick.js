/**
 * !kick @user [R3] [extra note] — remove a user from the group without a
 * persistent ban. Admin only.
 *
 * If a rule id (e.g. R3) is attached, the kick notice automatically loads the
 * rule title/description via RuleService and renders the unified moderation
 * message; otherwise a manual reason is used.
 */

import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';

export default {
  name: 'kick',
  description: 'Kick a user from the group (optionally cite a rule).',
  adminOnly: true,
  usage: '@user [RuleId] [note]',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.groupId) {
      return ctx.message.reply('⚠️ This command only works in groups.');
    }
    const targets = getMentionedIds(ctx.message);
    if (!targets.length) {
      return ctx.message.reply(usageText(ctx.config.prefix, 'kick', '@user [RuleId] [note]'));
    }
    const target = targets[0];

    const { rule, rest } = ctx.services.rule.parseModerationArgs(ctx.args, targets);
    const note = rest.join(' ').trim();
    const reason = rule ? rule.description : note || 'Removed by a moderator';

    let templates = null;
    if (rule) {
      templates = {
        kick: (v) =>
          moderationActionText({
            botName: v.botName,
            userId: v.userId,
            action: 'Kick',
            ruleId: rule.id,
            ruleTitle: rule.title,
            reason: rule.description,
            moderatorId: ctx.authorId,
          }),
      };
    }

    await ctx.services.moderation.kickUser(ctx.groupId, target, reason, templates);
    if (!rule) {
      await ctx.services.moderation.sendWithMentions(
        ctx.groupId,
        `✅ ${mentionToken(target)} kicked.`,
        [target],
      );
    }
  },
};
