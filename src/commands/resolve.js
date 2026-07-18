import { errorText } from './messages.js';

async function isAuthorizedStaff(ctx) {
 if (ctx.isOwner) return true;
 if (ctx.services.staff.repo.isStaffByAuthorId(ctx.authorId)) return true;
 if (ctx.authorName) {
  const nameLower = ctx.authorName.toLowerCase().trim();
  const allStaff = ctx.services.staff.repo.findAll();
  for (const s of allStaff) {
   if (s.name && nameLower.includes(s.name.toLowerCase().trim())) {
    await ctx.services.staff.repo.saveAuthorId(s.id, ctx.authorId);
    return true;
   }
  }
 }
 return false;
}

export default {
 name: 'resolve',
 description: 'Resolve a claimed support ticket. Staff only.',
 adminOnly: false,
 usage: '<ticketId>',
 async run(ctx) {
  if (!(await isAuthorizedStaff(ctx))) {
   return ctx.message.reply(errorText('Staff access required.', 'Only registered staff or the owner can resolve tickets.'));
  }

  const ticketId = (ctx.args[0] || '').toUpperCase();
  if (!ticketId) {
   return ctx.message.reply(errorText('Missing ticket ID.', `Use: ${ctx.config.prefix}resolve <ticketId>`));
  }

  const ticket = ctx.services.ticket.repo.findById(ticketId);
  if (!ticket) {
   return ctx.message.reply(errorText('Ticket not found.', `No ticket found with ID ${ticketId}.`));
  }

  if (ticket.status === 'Closed') {
   return ctx.message.reply(errorText('Ticket is closed.', `Ticket ${ticketId} is already closed.`));
  }

  if (ticket.status === 'Open') {
   return ctx.message.reply(errorText('Ticket not claimed.', `Claim ticket ${ticketId} first with !claim ${ticketId}.`));
  }

  if (ticket.status === 'Resolved') {
   return ctx.message.reply(errorText('Ticket already resolved.', `Ticket ${ticketId} is already resolved.`));
  }

  const resolved = await ctx.services.ticket.resolve(ticketId);
  if (!resolved) {
   return ctx.message.reply(errorText('Failed to resolve ticket.', 'The ticket could not be resolved.'));
  }

  const lines = [
   `🟡 *Ticket Resolved*`,
   '',
   `ID: *${ticketId}*`,
   `Category: ${ticket.category}`,
   `Assigned: *${ticket.assignedStaff?.name || 'Unknown'}*`,
   '',
   `Use *!close ${ticketId}* to close this ticket.`,
  ];

  await ctx.message.reply(lines.join('\n'));
 },
};
