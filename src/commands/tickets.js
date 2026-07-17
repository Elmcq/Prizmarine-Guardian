import { errorText } from './messages.js';

async function isAuthorizedStaff(ctx) {
 const isOwner = ctx.services.permission.isOwner(ctx.authorId);
 if (isOwner) return true;

 if (ctx.services.staff.repo.isStaffByAuthorId(ctx.authorId)) return true;

 if (String(ctx.authorId).includes('@lid')) {
  try {
   const contact = await ctx.client.getContactById(ctx.authorId);
   const phone = contact?.number?.replace(/[^0-9]/g, '');
   ctx.logger.info('LID resolution attempt', { authorId: ctx.authorId, phone, hasContact: !!contact });
   if (phone && ctx.services.staff.repo.isStaffByPhone(phone)) return true;
  } catch (err) {
   ctx.logger.info('LID resolution failed', { authorId: ctx.authorId, error: err.message });
  }
 }

 return false;
}

export default {
 name: 'tickets',
 description: 'List all open support tickets. Staff only.',
 adminOnly: false,
 usage: '',
 async run(ctx) {
  if (!(await isAuthorizedStaff(ctx))) {
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
