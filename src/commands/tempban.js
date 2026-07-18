import { getMentionedIds } from '../utils/mentions.js';
import { moderationText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'tempban',
 description: 'Temporarily ban a user for a duration (e.g. !tempban @user 7d R5).',
 adminOnly: true,
 usage: '@user [duration] [RuleId] [note]',
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  const targets = getMentionedIds(ctx.message);
  if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'tempban', '@user [duration] [RuleId] [note]'));
  const target = targets[0];
  const { rule, durationMs, rest } = ctx.services.rule.parseModerationArgs(ctx.args, targets, { withDuration: true });
  if (rule) ctx.services.rule.consumeRule(rule, ctx.groupId, target);
  const duration = durationMs ?? ctx.config.banDuration;
  const note = rest.join(' ').trim();
  const reason = rule ? rule.description : note || 'Banned by admin';
  const templates = {
   ban: (value) => moderationText({ userId: value.userId, action: 'TempBan', ruleId: rule?.id, ruleTitle: rule?.title, reason, moderatorId: ctx.authorId, durationMs: duration }),
  };
  await ctx.services.moderation.banUser(ctx.groupId, target, reason, templates, duration, { moderatorId: ctx.authorId, action: 'TEMPBAN' });
 },
};
