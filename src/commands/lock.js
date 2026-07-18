import { successText, errorText, GROUP_ONLY } from './messages.js';

export default {
 name: 'lock',
 description: 'Lock the group — only admins can send messages.',
 adminOnly: true,
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  try {
   const result = await ctx.client.pupPage.evaluate(async (chatId) => {
    const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
    if (!chat) throw new Error('Chat not found');
    if (!chat.groupMetadata) throw new Error('Not a group');
    try {
     await window.require('WAWebSetPropertyGroupAction').setGroupProperty(chat, 'announcement', 1);
     return true;
    } catch (err) {
     if (err.name === 'ServerStatusCodeError') return false;
     throw err;
    }
   }, ctx.groupId);
   if (!result) return ctx.message.reply(errorText('Failed to lock group.', 'No admin permissions.'));
   await ctx.message.reply(successText('Group Locked', 'Completed', 'Only admins can send messages now.'));
  } catch (err) {
   await ctx.message.reply(errorText('Failed to lock group.', err.message));
  }
 },
};
