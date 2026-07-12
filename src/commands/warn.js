import { getMentionedIds, extractReason } from '../utils/mentions.js';
import { moderationText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'warn',
 description: 'Manually warn a user (counts toward escalation).',
 adminOnly: true,
 usage: '@user [RuleId] [note]',
 async run(ctx) {
 if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
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
 warn: (value) => moderationText({ userId: value.userId, action: 'Warning', ruleId: rule.id, ruleTitle: rule.title, reason, moderatorId: ctx.authorId }),
 ban: (value) => moderationText({ userId: value.userId, action: 'Temporary punishment', ruleId: rule.id, ruleTitle: rule.title, reason, moderatorId: ctx.authorId, durationMs: value.durationMs }),
 };
 await ctx.services.moderation.issueWarning({ groupId: ctx.groupId, targetId: target, reason, issuerId: ctx.authorId, templates });
 return;
 }
 const reason = (await extractReason(ctx.args, targets, ctx.client)) || 'Manual warning by admin';
 const record = await ctx.services.moderation.issueWarning({ groupId: ctx.groupId, targetId: target, reason, issuerId: ctx.authorId });
 await ctx.services.moderation.sendWithMentions(
 ctx.groupId,
 moderationText({ userId: target, action: `Warning ${record.count}`, reason, moderatorId: ctx.authorId }),
 [target, ctx.authorId],
 );
 },
};
