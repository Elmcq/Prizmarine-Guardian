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

function resolveStaffName(ctx) {
 if (ctx.authorName && ctx.authorName !== ctx.authorId) return ctx.authorName;
 if (ctx.services.staff.repo.isStaffByAuthorId(ctx.authorId)) {
  const record = ctx.services.staff.repo.findByAuthorId?.(ctx.authorId);
  if (record?.name) return record.name;
 }
 const staffList = ctx.services.staff.repo.findAll();
 for (const s of staffList) {
  if (s.name && ctx.authorName?.toLowerCase().includes(s.name.toLowerCase())) return s.name;
 }
 return ctx.authorName || 'Staff';
}

function resolveStaffPhone(ctx) {
 if (ctx.services.staff.repo.isStaffByAuthorId(ctx.authorId)) {
  const record = ctx.services.staff.repo.findByAuthorId?.(ctx.authorId);
  if (record?.phone) return record.phone;
 }
 const staffList = ctx.services.staff.repo.findAll();
 for (const s of staffList) {
  if (s.name && ctx.authorName?.toLowerCase().includes(s.name.toLowerCase())) return s.phone;
 }
 return '';
}

export default {
 name: 'claim',
 description: 'Claim a support ticket. Staff only.',
 adminOnly: false,
 usage: '<ticketId>',
 async run(ctx) {
  if (!(await isAuthorizedStaff(ctx))) {
   return ctx.message.reply(errorText('Staff access required.', 'Only registered staff or the owner can claim tickets.'));
  }

  const ticketId = (ctx.args[0] || '').toUpperCase();
  if (!ticketId) {
   return ctx.message.reply(errorText('Missing ticket ID.', `Use: ${ctx.config.prefix}claim <ticketId>`));
  }

  const ticket = ctx.services.ticket.repo.findById(ticketId);
  if (!ticket) {
   return ctx.message.reply(errorText('Ticket not found.', `No ticket found with ID ${ticketId}.`));
  }

  if (ticket.status === 'Closed') {
   return ctx.message.reply(errorText('Ticket is closed.', `Ticket ${ticketId} is already closed.`));
  }

  if (ticket.status === 'Claimed') {
   return ctx.message.reply(errorText('Ticket already claimed.', `Ticket ${ticketId} is assigned to ${ticket.assignedStaff?.name || 'someone'}.`));
  }

  if (ticket.status === 'Resolved') {
   return ctx.message.reply(errorText('Ticket already resolved.', `Ticket ${ticketId} is resolved. Use !close to close it.`));
  }

  const staffName = resolveStaffName(ctx);
  const staffPhone = resolveStaffPhone(ctx);

  const claimed = await ctx.services.ticket.claim(ticketId, staffPhone, staffName);
  if (!claimed) {
   return ctx.message.reply(errorText('Failed to claim ticket.', 'The ticket could not be claimed.'));
  }

  if (claimed.chatId && staffPhone) {
   await ctx.services.ticket.addParticipantToGroup(claimed.chatId, staffPhone);
  }

  const lines = [
   `🔵 *Ticket Claimed*`,
   '',
   `ID: *${ticketId}*`,
   `Category: ${ticket.category}`,
   `Assigned to: *${staffName}*`,
   claimed.chatId ? `Group: ${claimed.chatId}` : null,
   '',
   `Use *!resolve ${ticketId}* when done.`,
  ].filter(Boolean);

  await ctx.message.reply(lines.join('\n'));
 },
};
