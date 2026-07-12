import { getMentionedIds, extractReason } from '../utils/mentions.js';
import { humanizeDuration } from '../utils/time.js';
import { moderationText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'ban',
 description: 'Instantly ban a user for the configured duration.',
 adminOnly: true,
 usage: '@user [RuleId] [note]',
 async run(ctx) {
 if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'ban', '@user [RuleId] [note]'));
 const target = targets[0];
 const parsed = ctx.services.rule.parseModerationArgs(ctx.args, targets);
 if (parsed.ruleId) {
 const rule = parsed.rule;
 const note = parsed.rest.join(' ').trim();
 const reason = note ? `${rule.description}\n\n${note}` : rule.description;
 const templates = { ban: (v) => moderationText({ userId: v.userId, action: 'Ban', ruleId: rule.id, ruleTitle: rule.title, reason, moderatorId: ctx.authorId }) };
 await ctx.services.moderation.banUser(ctx.groupId, target, reason, templates);
 return;
 }
 const reason = (await extractReason(ctx.args, targets, ctx.client)) || 'Banned by admin';
 await ctx.services.moderation.banUser(ctx.groupId, target, reason);
 await ctx.services.moderation.sendWithMentions(ctx.groupId, moderationText({ userId: target, action: `Ban (${humanizeDuration(ctx.config.banDuration)})`, reason, moderatorId: ctx.authorId }), [target, ctx.authorId]);
 },
};
