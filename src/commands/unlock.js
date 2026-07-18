import { successText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'unlock',
 description: 'Unlock the group — all members can send messages.',
 adminOnly: true,
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  try {
   const chat = await ctx.client.getChatById(ctx.groupId);
   await chat.setMessagesAdminsOnly(false);
   await ctx.message.reply(successText('Group Unlocked', 'Completed', 'All members can send messages now.'));
  } catch (err) {
   await ctx.message.reply(usageText(ctx.config.prefix, 'unlock', 'Failed to unlock group.'));
  }
 },
};
