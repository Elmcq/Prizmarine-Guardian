import { panelText } from './messages.js';

export default {
 name: 'tickets',
 description: 'List all open support tickets. Staff only.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
  const openTickets = ctx.services.ticket.repo.findOpen();

  if (!openTickets.length) {
   return ctx.message.reply('📋 No open tickets.');
  }

  const reply = ctx.services.ticket.formatList(openTickets);
  await ctx.message.reply(reply);
 },
};
