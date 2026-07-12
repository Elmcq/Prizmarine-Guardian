import { getMentionedIds, extractReason, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';
import { humanizeDuration } from '../utils/time.js';

export default {
 name: 'ban',
 description: 'Instantly ban a user for the configured duration.',
 adminOnly: true,
 usage: '@user [RuleId] [note]',
 async run(ctx) {
 if (!ctx.groupId) return ctx.message.reply('⚠️ This command only works in groups.');
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'ban', '@user [RuleId] [note]'));
 const target = targets[0];
 const parsed = ctx.services.rule.parseModerationArgs(ctx.args, targets);
 if (parsed.ruleId) {
 const rule = parsed.rule;
 ctx.services.rule.consumeRule(rule, ctx.groupId, target);
 const note = parsed.rest.join(' ').trim();
 const reason = note ? `${rule.description}\n\n${note}` : rule.description;
 const templates = {
 ban: (value) => moderationActionText({
 botName: value.botName,
 userId: value.userId,
 action: 'Ban',
 ruleId: rule.id,
 ruleTitle: rule.title,
 reason,
 moderatorId: ctx.authorId,
 }),
 };
 await ctx.services.moderation.banUser(ctx.groupId, target, reason, templates, null, { moderatorId: ctx.authorId, action: 'BAN' });
 return;
 }
 const reason = (await extractReason(ctx.args, targets, ctx.client)) || 'Banned by admin';
 await ctx.services.moderation.banUser(ctx.groupId, target, reason, null, null, { moderatorId: ctx.authorId, action: 'BAN' });
 await ctx.services.moderation.sendWithMentions(
 ctx.groupId,
 `✅ ${mentionToken(target)} banned for ${humanizeDuration(ctx.config.banDuration)}.`,
 [target],
 );
 },
};
