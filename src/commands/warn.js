/**
 * !warn @user [reason] — manually warn a user.
 * Reuses the same warning path as automatic detection, so reaching the
 * limit still triggers a ban. Admin only.
 */

import { getMentionedIds, extractReason, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';

export default {
  name: 'warn',
  description: 'Manually warn a user (counts toward the ban limit).',
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
      return ctx.message.reply(usageText(ctx.config.prefix, 'warn', '@user [RuleId] [note]'));
    }
    const target = targets[0];

    const parsed = ctx.services.rule.parseModerationArgs(ctx.args, targets);

    // Rule-based warning: auto-load the rule title/description into the notice.
    if (parsed.ruleId) {
      const rule = parsed.rule;
      const note = parsed.rest.join(' ').trim();
      const reason = note ? `${rule.description}\n\n${note}` : rule.description;
      const templates = {
        warn: (v) =>
          moderationActionText({
            botName: v.botName,
            userId: v.userId,
            action: 'Warning',
            ruleId: rule.id,
            ruleTitle: rule.title,
            reason,
            moderatorId: ctx.authorId,
          }),
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
      await ctx.services.moderation.issueWarning({
        groupId: ctx.groupId,
        targetId: target,
        reason,
        issuerId: ctx.authorId,
        templates,
      });
      return;
    }

    // Manual reason (backward compatible).
    const reason =
      (await extractReason(ctx.args, targets, ctx.client)) || 'Manual warning by admin';
    const record = await ctx.services.moderation.issueWarning({
      groupId: ctx.groupId,
      targetId: target,
      reason,
      issuerId: ctx.authorId,
    });
    const note =
      record.count >= ctx.config.warnLimit
        ? ' — limit reached, user was banned.'
        : '';
    await ctx.services.moderation.sendWithMentions(
      ctx.groupId,
      `✅ ${mentionToken(target)} warned (${record.count}/${ctx.config.warnLimit}).${note}`,
      [target],
    );
  },
};
