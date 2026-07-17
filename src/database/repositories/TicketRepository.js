/**
 * @file TicketRepository — CRUD for support ticket records (data/tickets.json).
 * Each ticket tracks a WhatsApp support request with status, category, and metadata.
 */

const CATEGORIES = ['general', 'technical', 'abuse', 'feature', 'other'];

export class TicketRepository {
 constructor(dbService) {
  this.dbService = dbService;
  this.db = dbService.tickets;
 }

 findById(id) {
  return this.db.data.records.find((r) => r.id === id) || null;
 }

 findByUser(userId) {
  return this.db.data.records.filter((r) => r.userId === userId);
 }

 findOpenByUser(userId) {
  return this.db.data.records.filter((r) => r.userId === userId && r.status === 'Open');
 }

 findOpen() {
  return this.db.data.records.filter((r) => r.status === 'Open');
 }

 findAll() {
  return this.db.data.records;
 }

 async create({ id, userId, category, description, groupId, groupName }) {
  const record = {
   id,
   userId,
   category: CATEGORIES.includes(category) ? category : 'general',
   description: description || '',
   status: 'Open',
   groupId: groupId || null,
   groupName: groupName || null,
   chatId: null,
   createdAt: Date.now(),
   closedAt: null,
   closedBy: null,
  };
  this.db.data.records.push(record);
  await this.dbService.persist(this.db);
  return record;
 }

 async setChatId(id, chatId) {
  const record = this.findById(id);
  if (!record) return null;
  record.chatId = chatId;
  await this.dbService.persist(this.db);
  return record;
 }

 async close(id, closedBy) {
  const record = this.findById(id);
  if (!record) return null;
  record.status = 'Closed';
  record.closedAt = Date.now();
  record.closedBy = closedBy || null;
  await this.dbService.persist(this.db);
  return record;
 }

 async reopen(id) {
  const record = this.findById(id);
  if (!record) return null;
  record.status = 'Open';
  record.closedAt = null;
  record.closedBy = null;
  await this.dbService.persist(this.db);
  return record;
 }

 count() {
  return this.db.data.records.length;
 }

 getStats() {
  const records = this.db.data.records;
  const open = records.filter((r) => r.status === 'Open').length;
  const closed = records.filter((r) => r.status === 'Closed').length;
  const byCategory = {};
  for (const r of records) {
   byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }
  return { total: records.length, open, closed, byCategory };
 }
}

export default TicketRepository;
