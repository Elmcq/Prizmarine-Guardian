import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';
import { humanizeDuration } from '../utils/time.js';

export default {
 name: 'tempban',
 description: 'Temporarily ban a user for a duration (e.g. !tempban @user 7d R5).',
 adminOnly: true,
 usage: '@user [duration] [RuleId] [note]',
 async run(ctx) {
 if (!ctx.groupId) return ctx.message.reply('⚠️ This command only works in groups.');
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'tempban', '@user [duration] [RuleId] [note]'));
 const target = targets[0];
 const { rule, durationMs, rest } = ctx.services.rule.parseModerationArgs(ctx.args, targets, { withDuration: true });
 if (rule) ctx.services.rule.consumeRule(rule, ctx.groupId, target);
 const duration = durationMs ?? ctx.config.banDuration;
 const note = rest.join(' ').trim();
 const reason = rule ? rule.description : note || 'Banned by admin';
 const templates = rule ? {
 ban: (value) => moderationActionText({
 botName: value.botName,
 userId: value.userId,
 action: 'TempBan',
 ruleId: rule.id,
 ruleTitle: rule.title,
 reason: rule.description,
 moderatorId: ctx.authorId,
 durationMs: duration,
 }),
 } : null;
 await ctx.services.moderation.banUser(ctx.groupId, target, reason, templates, duration, { moderatorId: ctx.authorId, action: 'TEMPBAN' });
 if (!rule) {
 await ctx.services.moderation.sendWithMentions(
 ctx.groupId,
 `✅ ${mentionToken(target)} temporarily banned for ${humanizeDuration(duration)}.`,
 [target],
 );
 }
 },
};
