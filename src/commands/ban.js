/**
 * !ban @user [reason] — instantly ban a user for the configured duration.
 * Admin only.
 */

import { getMentionedIds, extractReason, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';
import { humanizeDuration } from '../utils/time.js';

export default {
  name: 'ban',
  description: 'Instantly ban a user for the configured duration.',
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
      return ctx.message.reply(usageText(ctx.config.prefix, 'ban', '@user [RuleId] [note]'));
    }
    const target = targets[0];

    const parsed = ctx.services.rule.parseModerationArgs(ctx.args, targets);

    // Rule-based ban: auto-load the rule title/description into the notice.
    if (parsed.ruleId) {
      const rule = parsed.rule;
      const note = parsed.rest.join(' ').trim();
      const reason = note ? `${rule.description}\n\n${note}` : rule.description;
      const templates = {
        ban: (v) =>
          moderationActionText({
            botName: v.botName,
            userId: v.userId,
            action: 'Ban',
            ruleId: rule.id,
            ruleTitle: rule.title,
            reason,
            moderatorId: ctx.authorId,
          }),
      };
      await ctx.services.moderation.banUser(ctx.groupId, target, reason, templates);
      return;
    }

    // Manual reason (backward compatible).
    const reason =
      (await extractReason(ctx.args, targets, ctx.client)) || 'Banned by admin';
    await ctx.services.moderation.banUser(ctx.groupId, target, reason);
    await ctx.services.moderation.sendWithMentions(
      ctx.groupId,
      `✅ ${mentionToken(target)} banned for ${humanizeDuration(ctx.config.banDuration)}.`,
      [target],
    );
  },
};
