import { errorText } from './messages.js';

export default {
 name: 'myticket',
 description: 'View your support tickets.',
 adminOnly: false,
 usage: '',
 async run(ctx) {
  const userId = ctx.authorId;
  const tickets = ctx.services.ticket.repo.findByUser(userId);

  if (!tickets.length) {
   return ctx.message.reply('📋 You have no tickets. Use *!ticket <category>* to create one.');
  }

  const reply = ctx.services.ticket.formatList(tickets);
  await ctx.message.reply(reply);
 },
};
