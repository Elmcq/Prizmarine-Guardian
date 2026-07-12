import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { usageText } from '../utils/formatter.js';

export default {
 name: 'unban',
 description: 'Remove a user\'s active ban.',
 adminOnly: true,
 usage: '@user',
 async run(ctx) {
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'unban', '@user'));
 const target = targets[0];
 const removed = await ctx.services.moderation.unbanUser(target, ctx.authorId);
 await ctx.message.reply(
 removed
 ? `✅ ${mentionToken(target)} has been unbanned.`
 : `ℹ️ ${mentionToken(target)} had no active ban.`,
 );
 },
};
