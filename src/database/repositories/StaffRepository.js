/**
 * @file StaffRepository — CRUD for staff records (data/staff.json).
 * Tracks registered support staff who can manage tickets.
 */

export class StaffRepository {
 constructor(dbService) {
  this.dbService = dbService;
  this.db = dbService.staff;
 }

 findByPhone(phone) {
  const normalized = this.normalize(phone);
  return this.db.data.records.find((r) => this.normalize(r.phone) === normalized) || null;
 }

 findByAuthorId(authorId) {
  if (!authorId) return null;
  return this.db.data.records.find((r) => r.authorId === authorId) || null;
 }

 findAll() {
  return this.db.data.records;
 }

 isStaff(phone) {
  return this.findByPhone(phone) !== null;
 }

 /**
  * Check if a WhatsApp authorId (e.g. "12345@c.us" or "12345@lid") matches any staff.
  * Strips @c.us, @lid, and non-numeric characters before matching.
  */
 isStaffByAuthorId(authorId) {
  const cleaned = String(authorId).replace(/@(c\.us|lid)$/i, '').replace(/[^0-9]/g, '');
  if (!cleaned) return false;
  return this.db.data.records.some((r) => {
   if (this.normalize(r.phone) === cleaned) return true;
   if (r.authorId && r.authorId === authorId) return true;
   return false;
  });
 }

 /**
  * Check if a phone number matches any staff (for LID resolution).
  */
 isStaffByPhone(phone) {
  const normalized = this.normalize(phone);
  if (!normalized) return false;
  return this.db.data.records.some((r) => this.normalize(r.phone) === normalized);
 }

 async add(phone, name, role = 'support') {
  if (this.findByPhone(phone)) return null;
  const record = {
   id: this.dbService.uuid(),
   phone: this.normalize(phone),
   name: name || 'Staff',
   role,
   addedAt: Date.now(),
   addedBy: null,
  };
  this.db.data.records.push(record);
  await this.dbService.persist(this.db);
  return record;
 }

 async remove(phone) {
  const normalized = this.normalize(phone);
  const before = this.db.data.records.length;
  this.db.data.records = this.db.data.records.filter(
   (r) => this.normalize(r.phone) !== normalized,
  );
  const changed = before !== this.db.data.records.length;
  if (changed) await this.dbService.persist(this.db);
  return changed;
 }

 count() {
  return this.db.data.records.length;
 }

 async saveAuthorId(recordId, authorId) {
  const record = this.db.data.records.find((r) => r.id === recordId);
  if (record && !record.authorId) {
   record.authorId = authorId;
   await this.dbService.persist(this.db);
   return true;
  }
  return false;
 }

 normalize(phone) {
  return String(phone).replace(/[^0-9]/g, '');
 }
}

export default StaffRepository;
