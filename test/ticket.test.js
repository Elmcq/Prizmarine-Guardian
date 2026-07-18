import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TicketRepository } from '../src/database/repositories/TicketRepository.js';
import { TicketService } from '../src/services/TicketService.js';

function mockDb(records = []) {
 const data = { records: [...records] };
 return {
  data,
  read: async () => {},
  write: async () => {},
 };
}

function mockDbService(records = []) {
 const db = mockDb(records);
 return {
  tickets: db,
  persist: async () => {},
  uuid: () => 'test-uuid',
 };
}

function mockLogger() {
 return { info: () => {}, warn: () => {}, error: () => {} };
}

function mockClient(createGroupResult = { gid: { _serialized: 'group-123@g.us' } }) {
 return {
  info: { wid: { _serialized: 'bot@c.us' } },
  createGroup: async () => createGroupResult,
  sendMessage: async () => {},
  getContactById: async () => ({ number: '123456789' }),
  pupPage: { evaluate: async () => {} },
 };
}

function mockStaffRepo(staff = []) {
 return {
  findAll: () => staff,
  findByAuthorId: () => null,
 };
}

describe('TicketRepository', () => {
 let repo;
 let dbService;

 beforeEach(() => {
  dbService = mockDbService();
  repo = new TicketRepository(dbService);
 });

 it('create assigns id and default status Open', async () => {
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general', description: 'test' });
  assert.equal(ticket.id, 'TKT-0001');
  assert.equal(ticket.status, 'Open');
  assert.equal(ticket.userId, 'user1@c.us');
  assert.equal(ticket.assignedStaff, null);
 });

 it('create stores category', async () => {
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'technical', description: 'bug' });
  assert.equal(ticket.category, 'technical');
 });

 it('create defaults invalid category to general', async () => {
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'invalid', description: '' });
  assert.equal(ticket.category, 'general');
 });

 it('findById returns correct ticket', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.create({ id: 'TKT-0002', userId: 'user2@c.us', category: 'technical' });
  const found = repo.findById('TKT-0002');
  assert.equal(found.id, 'TKT-0002');
  assert.equal(found.userId, 'user2@c.us');
 });

 it('findById returns null for missing', async () => {
  assert.equal(repo.findById('TKT-9999'), null);
 });

 it('findByUser returns all tickets for user', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.create({ id: 'TKT-0002', userId: 'user1@c.us', category: 'technical' });
  await repo.create({ id: 'TKT-0003', userId: 'user2@c.us', category: 'general' });
  const tickets = repo.findByUser('user1@c.us');
  assert.equal(tickets.length, 2);
 });

 it('findOpenByUser returns only open tickets', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.create({ id: 'TKT-0002', userId: 'user1@c.us', category: 'technical' });
  await repo.close('TKT-0001', 'admin@c.us');
  const open = repo.findOpenByUser('user1@c.us');
  assert.equal(open.length, 1);
  assert.equal(open[0].id, 'TKT-0002');
 });

 it('close sets status Closed and closedBy', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const closed = await repo.close('TKT-0001', 'admin@c.us');
  assert.equal(closed.status, 'Closed');
  assert.equal(closed.closedBy, 'admin@c.us');
  assert.ok(closed.closedAt);
 });

 it('close returns null for missing ticket', async () => {
  const result = await repo.close('TKT-9999', 'admin@c.us');
  assert.equal(result, null);
 });

 it('claim sets status Claimed with assignedStaff', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const claimed = await repo.claim('TKT-0001', '628123456789', 'Yoga');
  assert.equal(claimed.status, 'Claimed');
  assert.equal(claimed.assignedStaff.phone, '628123456789');
  assert.equal(claimed.assignedStaff.name, 'Yoga');
  assert.ok(claimed.claimedAt);
 });

 it('claim returns null for non-Open ticket', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.claim('TKT-0001', '628123456789', 'Yoga');
  const result = await repo.claim('TKT-0001', '6289999999999', 'Other');
  assert.equal(result, null);
 });

 it('claim returns null for missing ticket', async () => {
  const result = await repo.claim('TKT-9999', '628123456789', 'Yoga');
  assert.equal(result, null);
 });

 it('resolve sets status Resolved', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.claim('TKT-0001', '628123456789', 'Yoga');
  const resolved = await repo.resolve('TKT-0001');
  assert.equal(resolved.status, 'Resolved');
  assert.ok(resolved.resolvedAt);
 });

 it('resolve returns null for non-Claimed ticket', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const result = await repo.resolve('TKT-0001');
  assert.equal(result, null);
 });

 it('reopen resets all status fields', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.claim('TKT-0001', '628123456789', 'Yoga');
  await repo.resolve('TKT-0001');
  const reopened = await repo.reopen('TKT-0001');
  assert.equal(reopened.status, 'Open');
  assert.equal(reopened.assignedStaff, null);
 });

 it('count returns total tickets', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.create({ id: 'TKT-0002', userId: 'user2@c.us', category: 'technical' });
  assert.equal(repo.count(), 2);
 });

 it('getStats counts by status and category', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await repo.create({ id: 'TKT-0002', userId: 'user2@c.us', category: 'technical' });
  await repo.create({ id: 'TKT-0003', userId: 'user3@c.us', category: 'general' });
  await repo.close('TKT-0002', 'admin@c.us');
  const stats = repo.getStats();
  assert.equal(stats.total, 3);
  assert.equal(stats.open, 2);
  assert.equal(stats.closed, 1);
  assert.equal(stats.byCategory.general, 2);
  assert.equal(stats.byCategory.technical, 1);
 });

 it('setChatId updates chatId', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const updated = await repo.setChatId('TKT-0001', 'group-chat@g.us');
  assert.equal(updated.chatId, 'group-chat@g.us');
 });
});

describe('TicketService', () => {
 let service;
 let repo;

 beforeEach(() => {
  const dbService = mockDbService();
  repo = new TicketRepository(dbService);
  service = new TicketService({ repo, logger: mockLogger() });
 });

 it('generateId produces TKT-0001 for empty repo', () => {
  assert.equal(service.generateId(), 'TKT-0001');
 });

 it('generateId increments', async () => {
  await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  assert.equal(service.generateId(), 'TKT-0002');
 });

 it('create returns ticket with generated id', async () => {
  const ticket = await service.create({ userId: 'user1@c.us', category: 'general', description: 'help' });
  assert.equal(ticket.id, 'TKT-0001');
  assert.equal(ticket.status, 'Open');
  assert.equal(ticket.description, 'help');
 });

 it('claim marks ticket as Claimed', async () => {
  await service.create({ userId: 'user1@c.us', category: 'technical' });
  const claimed = await service.claim('TKT-0001', '628123456789', 'Yoga');
  assert.equal(claimed.status, 'Claimed');
  assert.equal(claimed.assignedStaff.name, 'Yoga');
 });

 it('claim adds staff to group', async () => {
  let addedPhone;
  const client = {
   info: { wid: { _serialized: 'bot@c.us' } },
   createGroup: async () => ({ gid: { _serialized: 'group-123@g.us' } }),
   sendMessage: async () => {},
   getChatById: async () => ({
    addParticipants: async (ids) => { addedPhone = ids[0]; },
   }),
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await repo.setChatId('TKT-0001', 'group-123@g.us');
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  assert.equal(addedPhone, '628123456789@c.us');
 });

 it('claim skips adding staff when no chatId', async () => {
  service = new TicketService({ repo, logger: mockLogger(), client: {} });
  await service.create({ userId: 'user1@c.us', category: 'general' });
  const claimed = await service.claim('TKT-0001', '628123456789', 'Yoga');
  assert.equal(claimed.status, 'Claimed');
 });

 it('claim returns null for non-Open ticket', async () => {
  await service.create({ userId: 'user1@c.us', category: 'technical' });
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  const result = await service.claim('TKT-0001', '6289999999999', 'Other');
  assert.equal(result, null);
 });

 it('resolve marks ticket as Resolved', async () => {
  await service.create({ userId: 'user1@c.us', category: 'technical' });
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  const resolved = await service.resolve('TKT-0001');
  assert.equal(resolved.status, 'Resolved');
 });

 it('resolve returns null for non-Claimed ticket', async () => {
  await service.create({ userId: 'user1@c.us', category: 'technical' });
  const result = await service.resolve('TKT-0001');
  assert.equal(result, null);
 });

 it('close marks ticket as Closed', async () => {
  await service.create({ userId: 'user1@c.us', category: 'technical' });
  const closed = await service.close('TKT-0001', 'admin@c.us');
  assert.equal(closed.status, 'Closed');
 });

 it('close leaves WhatsApp group when chatId exists', async () => {
  let leftChatId = null;
  const client = {
   info: { wid: { _serialized: 'bot@c.us' } },
   pupPage: {
    evaluate: async (fn, chatId, meId) => { leftChatId = chatId; },
   },
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await repo.setChatId('TKT-0001', 'group-123@g.us');
  await service.close('TKT-0001', 'admin@c.us');
  assert.equal(leftChatId, 'group-123@g.us');
 });

 it('close handles leave error gracefully', async () => {
  const client = {
   info: { wid: { _serialized: 'bot@c.us' } },
   pupPage: {
    evaluate: async () => { throw new Error('Chat not found'); },
   },
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await repo.setChatId('TKT-0001', 'group-123@g.us');
  const closed = await service.close('TKT-0001', 'admin@c.us');
  assert.equal(closed.status, 'Closed');
 });

 it('close skips leave when no chatId', async () => {
  service = new TicketService({ repo, logger: mockLogger(), client: {} });
  await service.create({ userId: 'user1@c.us', category: 'general' });
  const closed = await service.close('TKT-0001', 'admin@c.us');
  assert.equal(closed.status, 'Closed');
 });

 it('formatTicket produces readable text', async () => {
  const ticket = await service.create({ userId: 'user1@c.us', category: 'abuse', description: 'harassment' });
  const text = service.formatTicket(ticket);
  assert.ok(text.includes('TKT-0001'));
  assert.ok(text.includes('Abuse Report'));
  assert.ok(text.includes('🟢 Open'));
 });

 it('formatTicket shows assigned staff', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  const ticket = repo.findById('TKT-0001');
  const text = service.formatTicket(ticket);
  assert.ok(text.includes('Yoga'));
  assert.ok(text.includes('🔵 Claimed'));
 });

 it('formatList produces readable text', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.create({ userId: 'user2@c.us', category: 'technical' });
  const text = service.formatList(repo.findAll());
  assert.ok(text.includes('TKT-0001'));
  assert.ok(text.includes('TKT-0002'));
 });

 it('formatList returns message when empty', () => {
  const text = service.formatList([]);
  assert.equal(text, '📋 No tickets found.');
 });

 it('formatStats shows totals', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.create({ userId: 'user2@c.us', category: 'technical' });
  await service.close('TKT-0001', 'admin@c.us');
  const text = service.formatStats();
  assert.ok(text.includes('Total: 2'));
  assert.ok(text.includes('Open: 1'));
  assert.ok(text.includes('Closed: 1'));
 });

 it('sendStatusMessage sends message to group', async () => {
  let sentMessage = null;
  const client = { sendMessage: async (chatId, msg) => { sentMessage = msg; } };
  service = new TicketService({ repo, logger: mockLogger(), client });
  await service.sendStatusMessage('group-123@g.us', { id: 'TKT-0001' }, 'Test message');
  assert.equal(sentMessage, 'Test message');
 });

 it('sendStatusMessage handles no client', async () => {
  service = new TicketService({ repo, logger: mockLogger() });
  await service.sendStatusMessage('group-123@g.us', { id: 'TKT-0001' }, 'Test message');
 });
});

describe('TicketService — group creation', () => {
 let service;
 let repo;

 beforeEach(() => {
  const dbService = mockDbService();
  repo = new TicketRepository(dbService);
 });

 it('createTicketGroup returns error when no client', async () => {
  service = new TicketService({ repo, logger: mockLogger() });
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const result = await service.createTicketGroup(ticket);
  assert.equal(result.chatId, null);
  assert.ok(result.error.includes('not available'));
 });

 it('createTicketGroup creates group and sets chatId', async () => {
  const client = mockClient({ gid: { _serialized: 'group-123@g.us' } });
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const result = await service.createTicketGroup(ticket);
  assert.equal(result.chatId, 'group-123@g.us');
  assert.equal(result.error, null);
  const updated = repo.findById('TKT-0001');
  assert.equal(updated.chatId, 'group-123@g.us');
 });

 it('createTicketGroup does NOT include staff in participants', async () => {
  let capturedParticipants;
   const client = {
    createGroup: async (name, participants) => {
     capturedParticipants = participants;
     return { gid: { _serialized: 'group-123@g.us' } };
    },
    sendMessage: async () => {},
   };
  const staffRepo = mockStaffRepo([
   { phone: '6281111111111', name: 'Staff1' },
   { phone: '6282222222222', name: 'Staff2' },
  ]);
  service = new TicketService({ repo, logger: mockLogger(), client, staffRepo });
  const ticket = await repo.create({ id: 'TKT-0001', userId: '6289999999999@c.us', category: 'general' });
  await service.createTicketGroup(ticket);
   assert.ok(capturedParticipants.includes('6289999999999@c.us'));
   assert.ok(!capturedParticipants.includes('6281111111111@c.us'));
   assert.ok(!capturedParticipants.includes('6282222222222@c.us'));
 });

 it('createTicketGroup handles API error gracefully', async () => {
  const client = {
   createGroup: async () => { throw new Error('WhatsApp API error'); },
   sendMessage: async () => {},
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const result = await service.createTicketGroup(ticket);
  assert.equal(result.chatId, null);
  assert.ok(result.error.includes('WhatsApp API error'));
 });

 it('createTicketGroup handles missing gid gracefully', async () => {
  const client = mockClient({ gid: null });
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  const result = await service.createTicketGroup(ticket);
  assert.equal(result.chatId, null);
  assert.ok(result.error.includes('Failed to get group ID'));
 });

 it('createTicketGroup resolves LID creator to phone', async () => {
  let capturedParticipants;
  const client = {
   getContactLidAndPhone: async (ids) => [{ lid: '12345@lid', pn: '6281234567890@c.us' }],
   createGroup: async (name, participants) => {
    capturedParticipants = participants;
    return { gid: { _serialized: 'group-123@g.us' } };
   },
   sendMessage: async () => {},
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: '12345@lid', category: 'general' });
  await service.createTicketGroup(ticket);
  assert.ok(capturedParticipants.includes('6281234567890@c.us'));
 });

 it('createTicketGroup sends invite link when LID cannot be resolved', async () => {
  let sentMessage, sentTo;
  const client = {
   getContactLidAndPhone: async () => [{ lid: '12345@lid', pn: undefined }],
   createGroup: async () => ({ gid: { _serialized: 'group-123@g.us' } }),
   getChatById: async () => ({ getInviteCode: async () => 'abc123' }),
   sendMessage: async (to, msg) => { sentTo = to; sentMessage = msg; },
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: '12345@lid', category: 'general' });
  await service.createTicketGroup(ticket);
  assert.equal(sentTo, '12345@lid');
  assert.ok(sentMessage.includes('chat.whatsapp.com/abc123'));
 });

 it('sendWelcomeMessage does not throw on error', async () => {
  const client = {
   sendMessage: async () => { throw new Error('Chat not found'); },
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'general' });
  await service.sendWelcomeMessage('group-123@g.us', ticket);
 });

 it('sendWelcomeMessage sends formatted message', async () => {
  let sentMessage;
  let sentChatId;
  const client = {
   sendMessage: async (chatId, msg) => { sentChatId = chatId; sentMessage = msg; },
  };
  service = new TicketService({ repo, logger: mockLogger(), client });
  const ticket = await repo.create({ id: 'TKT-0001', userId: 'user1@c.us', category: 'technical', description: 'Bug in login' });
  await service.sendWelcomeMessage('group-123@g.us', ticket);
  assert.equal(sentChatId, 'group-123@g.us');
  assert.ok(sentMessage.includes('TKT-0001'));
  assert.ok(sentMessage.includes('Technical Issue'));
  assert.ok(sentMessage.includes('Bug in login'));
 });
});

describe('Ticket lifecycle', () => {
 let service;
 let repo;

 beforeEach(() => {
  const dbService = mockDbService();
  repo = new TicketRepository(dbService);
  service = new TicketService({ repo, logger: mockLogger(), client: mockClient() });
 });

 it('full lifecycle: create → claim → resolve → close', async () => {
  const ticket = await service.create({ userId: 'user1@c.us', category: 'general', description: 'help' });
  assert.equal(ticket.status, 'Open');

  const claimed = await service.claim('TKT-0001', '628123456789', 'Yoga');
  assert.equal(claimed.status, 'Claimed');
  assert.equal(claimed.assignedStaff.name, 'Yoga');

  const resolved = await service.resolve('TKT-0001');
  assert.equal(resolved.status, 'Resolved');

  const closed = await service.close('TKT-0001', 'admin@c.us');
  assert.equal(closed.status, 'Closed');
 });

 it('cannot claim already claimed ticket', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  const result = await service.claim('TKT-0001', '6289999999999', 'Other');
  assert.equal(result, null);
 });

 it('cannot resolve unclaimed ticket', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  const result = await service.resolve('TKT-0001');
  assert.equal(result, null);
 });

 it('cannot claim closed ticket', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.close('TKT-0001', 'admin@c.us');
  const result = await service.claim('TKT-0001', '628123456789', 'Yoga');
  assert.equal(result, null);
 });

 it('formatList shows assigned staff', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  const text = service.formatList(repo.findAll());
  assert.ok(text.includes('Yoga'));
 });

 it('formatStats includes new statuses', async () => {
  await service.create({ userId: 'user1@c.us', category: 'general' });
  await service.create({ userId: 'user2@c.us', category: 'general' });
  await service.claim('TKT-0001', '628123456789', 'Yoga');
  const text = service.formatStats();
  assert.ok(text.includes('Open: 1'));
  assert.ok(text.includes('Claimed: 1'));
 });
});
