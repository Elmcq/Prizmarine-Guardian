import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { moderationActionText, usageText } from '../utils/formatter.js';

export default {
 name: 'kick',
 description: 'Kick a user from the group (optionally cite a rule).',
 adminOnly: true,
 usage: '@user [RuleId] [note]',
 async run(ctx) {
 if (!ctx.groupId) return ctx.message.reply('⚠️ This command only works in groups.');
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'kick', '@user [RuleId] [note]'));
 const target = targets[0];
 const { rule, rest } = ctx.services.rule.parseModerationArgs(ctx.args, targets);
 if (rule) ctx.services.rule.consumeRule(rule, ctx.groupId, target);
 const note = rest.join(' ').trim();
 const reason = rule ? rule.description : note || 'Removed by a moderator';
 const templates = rule ? {
 kick: (value) => moderationActionText({
 botName: value.botName,
 userId: value.userId,
 action: 'Kick',
 ruleId: rule.id,
 ruleTitle: rule.title,
 reason: rule.description,
 moderatorId: ctx.authorId,
 }),
 } : null;
 await ctx.services.moderation.kickUser(ctx.groupId, target, reason, templates, { moderatorId: ctx.authorId });
 if (!rule) await ctx.services.moderation.sendWithMentions(ctx.groupId, `✅ ${mentionToken(target)} kicked.`, [target]);
 },
};
