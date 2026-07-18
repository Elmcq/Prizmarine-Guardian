import { successText, errorText, GROUP_ONLY } from './messages.js';

export default {
 name: 'lock',
 description: 'Lock the group — only admins can send messages.',
 adminOnly: true,
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  try {
   await ctx.client.pupPage.evaluate(async (gId) => {
    const chat = await window.WWebJS.getChat(gId, { getAsModel: false });
    if (!chat) throw new Error('Chat not found');
    if (!chat.groupMetadata) throw new Error('Not a group');
    const meta = chat.groupMetadata;
    const newMeta = { ...meta, restrict: true };
    await window.require('WAWebSetGroupInfoAction').sendSetGroupInfo(chat.id, newMeta);
   }, ctx.groupId);
   await ctx.message.reply(successText('Group Locked', 'Completed', 'Only admins can send messages now.'));
  } catch (err) {
   await ctx.message.reply(errorText('Failed to lock group.', err.message));
  }
 },
};
