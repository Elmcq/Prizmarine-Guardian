/**
 * !tempban @user 7d [R5] [note] — temporarily ban a user for a given duration.
 * Admin only.
 *
 * Duration tokens: "7d", "12h", "30m", "1w". If a rule id (e.g. R5) is
 * attached, the ban notice automatically loads the rule title/description via
 * RuleService; otherwise a manual reason is used. Without a duration token the
 * configured BAN_DURATION is used.
 */

import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';
import { humanizeDuration } from '../utils/time.js';

export default {
  name: 'tempban',
  description: 'Temporarily ban a user for a duration (e.g. !tempban @user 7d R5).',
  adminOnly: true,
  usage: '@user <duration> [RuleId] [note]',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.groupId) {
      return ctx.message.reply('⚠️ This command only works in groups.');
    }
    const targets = getMentionedIds(ctx.message);
    if (!targets.length) {
      return ctx.message.reply(
        usageText(ctx.config.prefix, 'tempban', '@user <duration> [RuleId] [note]'),
      );
    }
    const target = targets[0];

    const { rule, durationMs, rest } = ctx.services.rule.parseModerationArgs(
      ctx.args,
      targets,
      { withDuration: true },
    );
    const duration = durationMs ?? ctx.config.banDuration;
    const note = rest.join(' ').trim();
    const reason = rule ? rule.description : note || 'Banned by admin';

    let templates = null;
    if (rule) {
      templates = {
        ban: (v) =>
          moderationActionText({
            botName: v.botName,
            userId: v.userId,
            action: 'TempBan',
            ruleId: rule.id,
            ruleTitle: rule.title,
            reason: rule.description,
            moderatorId: ctx.authorId,
            durationMs,
          }),
      };
    }

    await ctx.services.moderation.banUser(ctx.groupId, target, reason, templates, duration);
    if (!rule) {
      await ctx.services.moderation.sendWithMentions(
        ctx.groupId,
        `✅ ${mentionToken(target)} temporarily banned for ${humanizeDuration(duration)}.`,
        [target],
      );
    }
  },
};
