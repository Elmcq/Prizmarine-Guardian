/**
 * @file TicketService — business logic for WhatsApp support tickets.
 * Handles ticket lifecycle (OPEN → CLAIMED → RESOLVED → CLOSED),
 * staff assignment, group creation, and formatted output.
 */

const CATEGORY_LABELS = {
 general: 'General',
 technical: 'Technical Issue',
 abuse: 'Abuse Report',
 feature: 'Feature Request',
 other: 'Other',
};

const STATUS_ICONS = {
 Open: '🟢',
 Claimed: '🔵',
 Resolved: '🟡',
 Closed: '🔴',
};

const STATUS_LABELS = {
 Open: '🟢 Open',
 Claimed: '🔵 Claimed',
 Resolved: '🟡 Resolved',
 Closed: '🔴 Closed',
};

const DIVIDER = '━━━━━━━━━━━━━━';

export class TicketService {
 constructor({ repo, logger, client = null, staffRepo = null, contactResolver = null }) {
  this.repo = repo;
  this.logger = logger;
  this.client = client;
  this.staffRepo = staffRepo;
  this.contactResolver = contactResolver;
 }

 setClient(client) {
  this.client = client;
 }

 generateId() {
  const count = this.repo.count();
  const num = String(count + 1).padStart(4, '0');
  return `TKT-${num}`;
 }

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

 async createTicketGroup(ticket) {
  if (!this.client) {
   return { chatId: null, error: 'WhatsApp client not available' };
  }

  try {
   const groupName = `PRIZMARINE TICKET ${ticket.id}`;

    const participants = [];
    if (ticket.userId.endsWith('@lid') && this.client) {
     try {
      const [mapping] = await this.client.getContactLidAndPhone([ticket.userId]);
      if (mapping?.pn) {
       participants.push(mapping.pn);
      }
     } catch {}
    } else if (ticket.userId.endsWith('@c.us')) {
     participants.push(ticket.userId);
    }
    if (this.staffRepo) {
     const staffList = this.staffRepo.findAll();
     for (const s of staffList) {
      const staffPhone = s.phone.replace(/[^0-9]/g, '');
      if (staffPhone) {
       const staffWid = `${staffPhone}@c.us`;
       if (!participants.includes(staffWid)) {
        participants.push(staffWid);
       }
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

   if (ticket.userId.endsWith('@lid') && !participants.some(p => p !== ticket.userId)) {
    try {
     const groupChat = await this.client.getChatById(chatId);
     if (groupChat?.getInviteCode) {
      const inviteCode = await groupChat.getInviteCode();
      const inviteUrl = `https://chat.whatsapp.com/${inviteCode}`;
      await this.client.sendMessage(ticket.userId, `🎫 *Ticket ${ticket.id} — Support Group*\n\nYou were invited to a support group.\nJoin here: ${inviteUrl}`);
      this.logger.info('Sent group invite to LID user', { ticketId: ticket.id, userId: ticket.userId });
     }
    } catch (err) {
     this.logger.error('Failed to send group invite', { ticketId: ticket.id, error: err.message });
    }
   }

   this.logger.info('Ticket group created', { ticketId: ticket.id, chatId, participants: participants.length });
   return { chatId, error: null };
  } catch (err) {
   this.logger.error('Failed to create ticket group', { ticketId: ticket.id, error: err.message });
   return { chatId: null, error: err.message };
  }
 }

 async sendWelcomeMessage(chatId, ticket) {
  if (!this.client) return;

  try {
   const cat = CATEGORY_LABELS[ticket.category] || ticket.category;
   const lines = [
    `🎫 *Welcome to Ticket ${ticket.id}*`,
    '',
    DIVIDER,
    `Category: ${cat}`,
    `Status: ${STATUS_LABELS[ticket.status] || ticket.status}`,
    `Created by: @${ticket.userId.replace(/@c\.us$/, '')}`,
    ticket.description ? `Description: ${ticket.description}` : null,
    '',
    `Staff commands: *!claim ${ticket.id}* → *!resolve ${ticket.id}* → *!close ${ticket.id}*`,
    DIVIDER,
   ].filter(Boolean);

   await this.client.sendMessage(chatId, lines.join('\n'));
  } catch (err) {
   this.logger.error('Failed to send ticket welcome message', { ticketId: ticket.id, chatId, error: err.message });
  }
 }

 async sendStatusMessage(chatId, ticket, message) {
  if (!this.client || !chatId) return;

  try {
   await this.client.sendMessage(chatId, message);
  } catch (err) {
   this.logger.error('Failed to send status message', { ticketId: ticket.id, chatId, error: err.message });
  }
 }

 async addParticipantToGroup(chatId, phone) {
  if (!this.client || !chatId || !phone) return false;

  try {
   const chat = await this.client.getChatById(chatId);
   if (chat?.addParticipants) {
    await chat.addParticipants([`${phone}@c.us`]);
    return true;
   }
  } catch (err) {
   this.logger.error('Failed to add participant to group', { chatId, phone, error: err.message });
  }
  return false;
 }

 async claim(id, staffPhone, staffName) {
  const ticket = await this.repo.claim(id, staffPhone, staffName);
  if (!ticket) return null;

  this.logger.info('Ticket claimed', { ticketId: id, staffPhone, staffName });

  if (ticket.chatId) {
   const msg = [
    `🔵 *Ticket Claimed*`,
    '',
    `Staff: *${staffName}* (${staffPhone})`,
    `Status: ${STATUS_LABELS.Claimed}`,
    '',
    `Use *!resolve ${ticket.id}* when done.`,
   ].join('\n');
   await this.sendStatusMessage(ticket.chatId, ticket, msg);
  }

  return ticket;
 }

 async resolve(id) {
  const ticket = await this.repo.resolve(id);
  if (!ticket) return null;

  this.logger.info('Ticket resolved', { ticketId: id });

  if (ticket.chatId) {
   const staffInfo = ticket.assignedStaff ? ` by ${ticket.assignedStaff.name}` : '';
   const msg = [
    `🟡 *Ticket Resolved*`,
    '',
    `Status: ${STATUS_LABELS.Resolved}`,
    ticket.assignedStaff ? `Staff: *${ticket.assignedStaff.name}*` : null,
    '',
    `Use *!close ${ticket.id}* to close this ticket.`,
   ].filter(Boolean).join('\n');
   await this.sendStatusMessage(ticket.chatId, ticket, msg);
  }

  return ticket;
 }

 async close(id, closedBy) {
  const ticket = await this.repo.close(id, closedBy);
  if (ticket) {
   this.logger.info('Ticket closed', { ticketId: id, closedBy });

   if (ticket.chatId) {
    const msg = [
     `🔴 *Ticket Closed*`,
     '',
     `Status: ${STATUS_LABELS.Closed}`,
     `Closed by: @${closedBy.replace(/@c\.us$/, '')}`,
     `Time: ${new Date(ticket.closedAt).toLocaleString()}`,
    ].join('\n');
    await this.sendStatusMessage(ticket.chatId, ticket, msg);
   }

   if (ticket.chatId && this.client) {
    try {
     const meId = this.client.info.wid._serialized;
     await this.client.pupPage.evaluate(
      async (chatId, meId) => {
       const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
       if (!chat) throw new Error('Chat not found');
       if (!chat.groupMetadata) throw new Error('Not a group');

       const meIds = new Set([meId]);
       try {
        const identity = await window.WWebJS.enforceLidAndPnRetrieval(meId);
        if (identity?.lid?._serialized) meIds.add(identity.lid._serialized);
        if (identity?.phone?._serialized) meIds.add(identity.phone._serialized);
       } catch {}

       const participants = chat.groupMetadata.participants.getModelsArray().filter(p => !meIds.has(p.id._serialized));
       if (participants.length > 0) {
        await window.require('WAWebModifyParticipantsGroupAction').removeParticipants(chat, participants);
       }

       return window.require('WAWebExitGroupAction').sendExitGroup(chat);
      },
      ticket.chatId,
      meId
     );
     this.logger.info('Left ticket group', { ticketId: id, chatId: ticket.chatId });
    } catch (err) {
     this.logger.error('Failed to leave ticket group', { ticketId: id, chatId: ticket.chatId, error: err.message });
    }
   }
  }
  return ticket;
 }

 formatTicket(ticket) {
  const cat = CATEGORY_LABELS[ticket.category] || ticket.category;
  const statusIcon = STATUS_ICONS[ticket.status] || '⚪';
  const lines = [
   `🎫 *Ticket ${ticket.id}*`,
   '',
   DIVIDER,
   `Category: ${cat}`,
   `Status: ${statusIcon} ${ticket.status}`,
   `User: @${ticket.userId.replace(/@c\.us$/, '')}`,
  ];
  if (ticket.assignedStaff) {
   lines.push(`Assigned: *${ticket.assignedStaff.name}* (${ticket.assignedStaff.phone})`);
  }
  if (ticket.description) lines.push(`Description: ${ticket.description}`);
  if (ticket.groupName) lines.push(`Group: ${ticket.groupName}`);
  if (ticket.chatId) lines.push(`Support Group: ${ticket.chatId}`);
  if (ticket.closedBy) lines.push(`Closed by: @${ticket.closedBy.replace(/@c\.us$/, '')}`);
  if (ticket.closedAt) lines.push(`Closed at: ${new Date(ticket.closedAt).toLocaleString()}`);
  lines.push(`Created: ${new Date(ticket.createdAt).toLocaleString()}`);
  lines.push(DIVIDER);
  return lines.join('\n');
 }

 formatList(tickets) {
  if (!tickets.length) return '📋 No tickets found.';
  const lines = ['📋 *Ticket List*', '', DIVIDER];
  for (const t of tickets) {
   const icon = STATUS_ICONS[t.status] || '⚪';
   const cat = CATEGORY_LABELS[t.category] || t.category;
   const staff = t.assignedStaff ? ` → ${t.assignedStaff.name}` : '';
   lines.push(`${icon} *${t.id}* — ${cat}${staff}`);
  }
  lines.push(DIVIDER);
  return lines.join('\n');
 }

 formatStats() {
  const stats = this.repo.getStats();
  const lines = [
   '📊 *Ticket Stats*',
   '',
   DIVIDER,
   `Total: ${stats.total}`,
   `🟢 Open: ${stats.open}`,
   `🔵 Claimed: ${stats.claimed}`,
   `🟡 Resolved: ${stats.resolved}`,
   `🔴 Closed: ${stats.closed}`,
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
