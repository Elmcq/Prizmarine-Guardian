import { EVENTS } from '../config/constants.js';
import { humanizeDuration } from '../utils/time.js';

export class HealthService {
 constructor(loggerInstance, eventBus, repos, startTime = Date.now()) {
 this.logger = loggerInstance;
 this.eventBus = eventBus;
 this.repos = repos;
 this.startTime = startTime;
 this.status = 'starting';
 this.eventBus.on(EVENTS.CONNECTION, ({ state }) => {
 this.status = state === 'ready' ? 'online' : state || 'offline';
 });
 this.eventBus.on(EVENTS.ERROR, ({ type }) => {
 if (type === 'auth_failure') this.status = 'auth_error';
 });
 }

 getStats() {
 const mem = process.memoryUsage();
 return {
 status: this.status,
 uptimeMs: Date.now() - this.startTime,
 uptimeHuman: humanizeDuration(Date.now() - this.startTime),
 memory: {
 rssMb: Math.round(mem.rss / 1024 / 1024),
 heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
 heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
 },
 totalWarnings: this.repos.warnings.count(),
 activeBans: this.repos.bans.activeCount(),
 messagesSeen: this.repos.settings.getMessagesSeen(),
 blockedMessages: this.repos.settings.getBlockedMessages(),
 };
 }

 heartbeat() {
 const stats = this.getStats();
 this.logger.info('Health heartbeat', {
 status: stats.status,
 uptime: stats.uptimeHuman,
 rssMb: stats.memory.rssMb,
 warnings: stats.totalWarnings,
 activeBans: stats.activeBans,
 blockedMessages: stats.blockedMessages,
 });
 this.eventBus.emit(EVENTS.HEALTH, stats);
 }
}

export default HealthService;
