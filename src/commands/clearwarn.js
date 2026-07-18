import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { successText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'clearwarn',
 description: 'Reset warnings. Self-clear or clear another user (admin/owner).',
 adminOnly: false,
 usage: '[@user]',
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  const targets = getMentionedIds(ctx.message);
  const target = targets[0] || ctx.authorId;

  if (targets.length && !ctx.isAdmin && !ctx.isOwner) {
   return ctx.message.reply(usageText(ctx.config.prefix, 'clearwarn', 'You can only clear your own warnings.'));
  }

  await ctx.services.moderation.clearWarnings(ctx.groupId, target);
  await ctx.services.moderation.sendWithMentions(ctx.groupId, successText('Warnings cleared', 'Completed', `${mentionToken(target)} now has 0 warnings.`), [target]);
 },
};
