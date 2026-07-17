/**
 * @file TicketService — business logic for WhatsApp support tickets.
 * Handles ticket creation, closing, listing, and formatted output.
 * Supports automatic WhatsApp group creation for ticket management.
 */

const CATEGORY_LABELS = {
 general: 'General',
 technical: 'Technical Issue',
 abuse: 'Abuse Report',
 feature: 'Feature Request',
 other: 'Other',
};

const DIVIDER = '━━━━━━━━━━━━━━';

export class TicketService {
 constructor({ repo, logger, client = null, staffRepo = null }) {
  this.repo = repo;
  this.logger = logger;
  this.client = client;
  this.staffRepo = staffRepo;
 }

 setClient(client) {
  this.client = client;
 }

 /**
  * Generate a unique ticket ID like TKT-0001.
  */
 generateId() {
  const count = this.repo.count();
  const num = String(count + 1).padStart(4, '0');
  return `TKT-${num}`;
 }

 /**
  * Create a new ticket.
  */
 async create({ userId, category, description, groupId, groupName }) {
  const id = this.generateId();
  const ticket = await this.repo.create({
   id,
   userId,
   category,
   description,
   groupId,
   groupName,
  });
  this.logger.info('Ticket created', { ticketId: id, userId, category });
  return ticket;
 }

 /**
  * Create a WhatsApp group for the ticket.
  * @param {object} ticket - The ticket record.
  * @returns {Promise<{chatId: string|null, error: string|null}>}
  */
 async createTicketGroup(ticket) {
  if (!this.client) {
   return { chatId: null, error: 'WhatsApp client not available' };
  }

  try {
   const groupName = `PRIZMARINE TICKET ${ticket.id}`;

    const participants = [];
    const creatorPhone = ticket.userId.replace(/@(c\.us|lid)$/i, '').replace(/[^0-9]/g, '');
    if (creatorPhone) participants.push(`${creatorPhone}@c.us`);
    if (this.staffRepo) {
     const staffList = this.staffRepo.findAll();
     for (const s of staffList) {
      const staffPhone = s.phone.replace(/[^0-9]/g, '');
      if (staffPhone && !participants.includes(`${staffPhone}@c.us`)) {
       participants.push(`${staffPhone}@c.us`);
      }
     }
    }

   const chat = await this.client.createGroup(groupName, participants);
   const chatId = chat.gid?._serialized || chat.gid || null;

   if (!chatId) {
    return { chatId: null, error: 'Failed to get group ID from response' };
   }

   await this.repo.setChatId(ticket.id, chatId);

   await this.sendWelcomeMessage(chatId, ticket);

   this.logger.info('Ticket group created', { ticketId: ticket.id, chatId, participants: participants.length });
   return { chatId, error: null };
  } catch (err) {
   this.logger.error('Failed to create ticket group', { ticketId: ticket.id, error: err.message });
   return { chatId: null, error: err.message };
  }
 }

 /**
  * Send a welcome message to the ticket group.
  */
 async sendWelcomeMessage(chatId, ticket) {
  if (!this.client) return;

  try {
   const chat = await this.client.getChatById(chatId);
   const cat = CATEGORY_LABELS[ticket.category] || ticket.category;
   const lines = [
    `🎫 *Welcome to Ticket ${ticket.id}*`,
    '',
    DIVIDER,
    `Category: ${cat}`,
    `Created by: @${ticket.userId.replace(/@c\.us$/, '')}`,
    ticket.description ? `Description: ${ticket.description}` : null,
    '',
    `Use *!close ${ticket.id}* to close this ticket.`,
    DIVIDER,
   ].filter(Boolean);

   await chat.sendMessage(lines.join('\n'));
  } catch (err) {
   this.logger.error('Failed to send ticket welcome message', { ticketId: ticket.id, chatId, error: err.message });
  }
 }

 /**
  * Close a ticket.
  */
 async close(id, closedBy) {
  const ticket = await this.repo.close(id, closedBy);
  if (ticket) {
   this.logger.info('Ticket closed', { ticketId: id, closedBy });
  }
  return ticket;
 }

 /**
  * Format a single ticket for display.
  */
 formatTicket(ticket) {
  const cat = CATEGORY_LABELS[ticket.category] || ticket.category;
  const lines = [
   `🎫 *Ticket ${ticket.id}*`,
   '',
   DIVIDER,
   `Category: ${cat}`,
   `Status: ${ticket.status === 'Open' ? '🟢 Open' : '🔴 Closed'}`,
   `User: @${ticket.userId.replace(/@c\.us$/, '')}`,
  ];
  if (ticket.description) lines.push(`Description: ${ticket.description}`);
  if (ticket.groupName) lines.push(`Group: ${ticket.groupName}`);
  if (ticket.chatId) lines.push(`Support Group: ${ticket.chatId}`);
  if (ticket.closedBy) lines.push(`Closed by: @${ticket.closedBy.replace(/@c\.us$/, '')}`);
  if (ticket.closedAt) lines.push(`Closed at: ${new Date(ticket.closedAt).toLocaleString()}`);
  lines.push(`Created: ${new Date(ticket.createdAt).toLocaleString()}`);
  lines.push(DIVIDER);
  return lines.join('\n');
 }

 /**
  * Format a list of tickets.
  */
 formatList(tickets) {
  if (!tickets.length) return '📋 No tickets found.';
  const lines = ['📋 *Ticket List*', '', DIVIDER];
  for (const t of tickets) {
   const icon = t.status === 'Open' ? '🟢' : '🔴';
   const cat = CATEGORY_LABELS[t.category] || t.category;
   lines.push(`${icon} *${t.id}* — ${cat} — @${t.userId.replace(/@c\.us$/, '')}`);
  }
  lines.push(DIVIDER);
  return lines.join('\n');
 }

 /**
  * Format stats summary.
  */
 formatStats() {
  const stats = this.repo.getStats();
  const lines = [
   '📊 *Ticket Stats*',
   '',
   DIVIDER,
   `Total: ${stats.total}`,
   `Open: ${stats.open}`,
   `Closed: ${stats.closed}`,
  ];
  if (Object.keys(stats.byCategory).length) {
   lines.push('');
   for (const [cat, count] of Object.entries(stats.byCategory)) {
    const label = CATEGORY_LABELS[cat] || cat;
    lines.push(`${label}: ${count}`);
   }
  }
  lines.push(DIVIDER);
  return lines.join('\n');
 }
}

export default TicketService;
