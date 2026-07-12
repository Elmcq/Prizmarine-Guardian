import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { successText, errorText, usageText } from './messages.js';

export default {
 name: 'unban',
 description: 'Remove a user\'s active ban.',
 adminOnly: true,
 usage: '@user',
 async run(ctx) {
 const targets = getMentionedIds(ctx.message);
 if (!targets.length) return ctx.message.reply(usageText(ctx.config.prefix, 'unban', '@user'));
 const target = targets[0];
 const removed = await ctx.services.moderation.unbanUser(target);
 await ctx.message.reply(removed ? successText('Ban removed', 'Completed', `${mentionToken(target)} may rejoin.`) : errorText(`${mentionToken(target)} has no active ban.`, 'Provide a currently banned user.'));
 },
};
