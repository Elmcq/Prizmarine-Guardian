import { errorText } from './messages.js';

export default {
 name: 'tickets',
 description: 'List all open support tickets. Staff only.',
 adminOnly: false,
 usage: '',
 async run(ctx) {
  const isOwner = ctx.services.permission.isOwner(ctx.authorId);
  const isStaff = ctx.services.staff.repo.isStaffByAuthorId(ctx.authorId);
  if (!isOwner && !isStaff) {
   return ctx.message.reply(errorText('Staff access required.', 'Only registered staff or the owner can use this command.'));
  }

  const openTickets = ctx.services.ticket.repo.findOpen();

  if (!openTickets.length) {
   return ctx.message.reply('📋 No open tickets.');
  }

  const reply = ctx.services.ticket.formatList(openTickets);
  await ctx.message.reply(reply);
 },
};
