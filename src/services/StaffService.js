/**
 * @file StaffService — business logic for staff management.
 * Handles staff registration, removal, and formatted output.
 */

const DIVIDER = '━━━━━━━━━━━━━━';

export class StaffService {
 constructor({ repo, logger }) {
  this.repo = repo;
  this.logger = logger;
 }

 isStaff(phone) {
  return this.repo.isStaff(phone);
 }

 async add(phone, name, addedBy) {
  const record = await this.repo.add(phone, name);
  if (record) {
   record.addedBy = addedBy || null;
   this.logger.info('Staff added', { phone: record.phone, name, addedBy });
  }
  return record;
 }

 async remove(phone) {
  const removed = await this.repo.remove(phone);
  if (removed) {
   this.logger.info('Staff removed', { phone: this.repo.normalize(phone) });
  }
  return removed;
 }

 formatStaffList(staff) {
  if (!staff.length) return '📋 No staff registered.';
  const lines = ['👥 *Staff List*', '', DIVIDER];
  for (const s of staff) {
   lines.push(`• ${s.name} — ${s.phone} (${s.role})`);
  }
  lines.push(DIVIDER);
  lines.push(`Total: ${staff.length}`);
  return lines.join('\n');
 }

 formatStaffAdded(record) {
  return [
   '✅ *Staff Added*',
   '',
   DIVIDER,
   `Name: ${record.name}`,
   `Phone: ${record.phone}`,
   `Role: ${record.role}`,
   DIVIDER,
  ].join('\n');
 }

 formatStaffRemoved(phone) {
  return [
   '✅ *Staff Removed*',
   '',
   DIVIDER,
   `Phone: ${phone}`,
   DIVIDER,
  ].join('\n');
 }
}

export default StaffService;
