import { LIMITS } from '../../config/constants.js';

export class AuditRepository {
 constructor(dbService) {
 this.dbService = dbService;
 this.db = dbService.audit;
 }

 async add(entry) {
 const record = {
 id: this.dbService.uuid(),
 user: entry.user || 'unknown',
 moderator: entry.moderator || 'system',
 action: String(entry.action || 'UNKNOWN').toUpperCase(),
 reason: entry.reason || '',
 groupId: entry.groupId || null,
 timestamp: Number(entry.timestamp) || Date.now(),
 details: entry.details && typeof entry.details === 'object' ? entry.details : {},
 };
 this.db.data.records.unshift(record);
 if (this.db.data.records.length > LIMITS.AUDIT_KEEP) {
 this.db.data.records.length = LIMITS.AUDIT_KEEP;
 }
 await this.dbService.persist(this.db);
 return record;
 }

 all(limit = 100) {
 const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
 return this.db.data.records.slice(0, safeLimit);
 }

 count() {
 return this.db.data.records.length;
 }
}

export default AuditRepository;
