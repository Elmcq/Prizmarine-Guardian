import { errorText, successText } from './messages.js';

export default {
 name: 'close',
 description: 'Close a support ticket. Staff only.',
 adminOnly: true,
 usage: '<ticketId>',
 async run(ctx) {
  const ticketId = (ctx.args[0] || '').toUpperCase();
  if (!ticketId) {
   return ctx.message.reply(errorText('Missing ticket ID.', `Use: ${ctx.config.prefix}close <ticketId>`));
  }

  const ticket = ctx.services.ticket.repo.findById(ticketId);
  if (!ticket) {
   return ctx.message.reply(errorText('Ticket not found.', `No ticket found with ID ${ticketId}.`));
  }

  if (ticket.status === 'Closed') {
   return ctx.message.reply(errorText('Ticket already closed.', `Ticket ${ticketId} was closed at ${new Date(ticket.closedAt).toLocaleString()}.`));
  }

  const isOwner = ctx.services.permission.isOwner(ctx.authorId);
  const isStaff = ctx.services.staff.isStaff(ctx.authorId.replace(/@c\.us$/, ''));
  if (!isOwner && !isStaff) {
   return ctx.message.reply(errorText('Staff access required.', 'Only registered staff or the owner can close tickets.'));
  }

  const closed = await ctx.services.ticket.close(ticketId, ctx.authorId);
  ctx.logger.info('Ticket closed by staff', { ticketId, staff: ctx.authorId });

  const lines = [
   `✅ *Ticket Closed*`,
   '',
   `ID: *${ticketId}*`,
   `Category: ${ticket.category}`,
   `Closed by: @${ctx.authorId.replace(/@c\.us$/, '')}`,
   `Time: ${new Date(closed.closedAt).toLocaleString()}`,
  ];

  await ctx.message.reply(lines.join('\n'));
 },
};
