import { successText, errorText, GROUP_ONLY } from './messages.js';

export default {
 name: 'unlock',
 description: 'Unlock the group — all members can send messages.',
 adminOnly: true,
 async run(ctx) {
  if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
  try {
   await ctx.client.pupPage.evaluate(async (gId) => {
    const chat = await window.WWebJS.getChat(gId, { getAsModel: false });
    if (!chat) throw new Error('Chat not found');
    if (!chat.groupMetadata) throw new Error('Not a group');
    const meta = chat.groupMetadata;
    const newMeta = { ...meta, restrict: false };
    await window.require('WAWebSetGroupInfoAction').sendSetGroupInfo(chat.id, newMeta);
   }, ctx.groupId);
   await ctx.message.reply(successText('Group Unlocked', 'Completed', 'All members can send messages now.'));
  } catch (err) {
   await ctx.message.reply(errorText('Failed to unlock group.', err.message));
  }
 },
};
