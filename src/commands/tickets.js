import { errorText } from './messages.js';

async function isAuthorizedStaff(ctx) {
 const isOwner = ctx.services.permission.isOwner(ctx.authorId);
 if (isOwner) return true;

 if (ctx.services.staff.repo.isStaffByAuthorId(ctx.authorId)) return true;

 if (ctx.authorName) {
  const nameLower = ctx.authorName.toLowerCase().trim();
  const allStaff = ctx.services.staff.repo.findAll();
  ctx.logger.info('Staff name check', { authorName: ctx.authorName, nameLower, staffNames: allStaff.map(s => s.name) });
  for (const s of allStaff) {
   if (s.name && nameLower.includes(s.name.toLowerCase().trim())) return true;
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
