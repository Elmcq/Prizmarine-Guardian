import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { successText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'clearwarn',
 description: 'Reset warnings for a user (admin/owner only).',
 adminOnly: true,
 usage: '@user',
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  const targets = getMentionedIds(ctx.message);
  if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'clearwarn', '@user'));
  const target = targets[0];

  await ctx.services.moderation.clearWarnings(ctx.groupId, target);
  await ctx.services.moderation.sendWithMentions(ctx.groupId, successText('Warnings cleared', 'Completed', `${mentionToken(target)} now has 0 warnings.`), [target]);
 },
};
