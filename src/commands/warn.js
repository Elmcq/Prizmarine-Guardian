import { getMentionedIds, extractReason, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';

export default {
 name: 'warn',
 description: 'Manually warn a user (counts toward escalation).',
 adminOnly: true,
 usage: '@user [RuleId] [note]',
 async run(ctx) {
 if (!ctx.groupId) return ctx.message.reply('⚠️ This command only works in groups.');
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'warn', '@user [RuleId] [note]'));
 const target = targets[0];
 const parsed = ctx.services.rule.parseModerationArgs(ctx.args, targets);
 if (parsed.ruleId) {
 const rule = parsed.rule;
 ctx.services.rule.consumeRule(rule, ctx.groupId, target);
 const note = parsed.rest.join(' ').trim();
 const reason = note ? `${rule.description}\n\n${note}` : rule.description;
 const templates = {
 warn: (value) => moderationActionText({
 botName: value.botName,
 userId: value.userId,
 action: 'Warning',
 ruleId: rule.id,
 ruleTitle: rule.title,
 reason,
 moderatorId: ctx.authorId,
 }),
 ban: (value) => moderationActionText({
 botName: value.botName,
 userId: value.userId,
 action: 'TempBan',
 ruleId: rule.id,
 ruleTitle: rule.title,
 reason,
 moderatorId: ctx.authorId,
 durationMs: value.durationMs,
 }),
 };
 await ctx.services.moderation.issueWarning({ groupId: ctx.groupId, targetId: target, reason, issuerId: ctx.authorId, templates });
 return;
 }
 const reason = (await extractReason(ctx.args, targets, ctx.client)) || 'Manual warning by admin';
 const record = await ctx.services.moderation.issueWarning({ groupId: ctx.groupId, targetId: target, reason, issuerId: ctx.authorId });
 await ctx.services.moderation.sendWithMentions(
 ctx.groupId,
 `✅ ${mentionToken(target)} warned. Total warnings: ${record.count}.`,
 [target],
 );
 },
};
