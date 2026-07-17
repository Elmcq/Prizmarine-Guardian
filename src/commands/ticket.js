import { errorText, successText, panelText, usageText } from './messages.js';

const CATEGORIES = ['general', 'technical', 'abuse', 'feature', 'other'];

export default {
 name: 'ticket',
 description: 'Create a support ticket. Categories: general, technical, abuse, feature, other.',
 adminOnly: false,
 usage: '<category> [description]',
 async run(ctx) {
  const category = (ctx.args[0] || '').toLowerCase();
  if (!category || !CATEGORIES.includes(category)) {
   return ctx.message.reply(usageText(ctx.config.prefix, 'ticket', '<category> [description]\nCategories: general, technical, abuse, feature, other'));
  }

  const description = ctx.args.slice(1).join(' ') || '';
  const userId = ctx.authorId;
  const groupId = ctx.chat?.id || null;
  const groupName = ctx.chat?.name || null;

  const openTickets = ctx.services.ticket.repo.findOpenByUser(userId);
  if (openTickets.length >= 3) {
   return ctx.message.reply(errorText('Ticket limit reached.', 'You already have 3 open tickets. Close one before creating a new ticket.'));
  }

  const ticket = await ctx.services.ticket.create({
   userId,
   category,
   description,
   groupId,
   groupName,
  });

  ctx.logger.info('Ticket created', { ticketId: ticket.id, userId, category });

  let groupResult = null;
  try {
   groupResult = await ctx.services.ticket.createTicketGroup(ticket);
  } catch (err) {
   ctx.logger.error('Ticket group creation failed', { ticketId: ticket.id, error: err.message });
  }

  const lines = [
   `🎫 *Ticket Created*`,
   '',
   `ID: *${ticket.id}*`,
   `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}`,
   description ? `Description: ${description}` : null,
  ];

  if (groupResult?.chatId) {
   lines.push(`Group: ${groupResult.chatId}`);
  } else if (groupResult?.error) {
   lines.push(`Group: Failed to create (${groupResult.error})`);
  }

  lines.push(
   '',
   `Use *!myticket* to view your tickets.`,
   `Use *!close ${ticket.id}* to close this ticket.`,
  );

  await ctx.message.reply(lines.filter(Boolean).join('\n'));
 },
};
