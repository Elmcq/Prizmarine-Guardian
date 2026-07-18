import { successText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'lock',
 description: 'Lock the group — only admins can send messages.',
 adminOnly: true,
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  try {
   const chat = await ctx.client.getChatById(ctx.groupId);
   await chat.setMessagesAdminsOnly(true);
   await ctx.message.reply(successText('Group Locked', 'Completed', 'Only admins can send messages now.'));
  } catch (err) {
   await ctx.message.reply(usageText(ctx.config.prefix, 'lock', 'Failed to lock group.'));
  }
 },
};
