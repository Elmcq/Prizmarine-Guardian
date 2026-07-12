/**
 * @file HealthService — gathers runtime statistics and emits periodic
 * health heartbeats. Consumed by the SchedulerService and the `!stats`
 * command.
 */

import { logger } from '../logger/winston.js';
import { EVENTS } from '../config/constants.js';
import { humanizeDuration } from '../utils/time.js';

export class HealthService {
  /**
   * @param {import('winston').Logger} loggerInstance
   * @param {import('../events/EventBus.js').EventBus} eventBus
   * @param {{
   *   warnings: import('../database/repositories/WarningRepository.js').WarningRepository,
   *   bans: import('../database/repositories/BanRepository.js').BanRepository,
   *   settings: import('../database/repositories/SettingsRepository.js').SettingsRepository
   * }} repos
   * @param {number} startTime - process start epoch (ms).
   */
  constructor(loggerInstance, eventBus, repos, startTime = Date.now()) {
    this.logger = loggerInstance;
    this.eventBus = eventBus;
    this.repos = repos;
    this.startTime = startTime;
  }

  /** @returns {object} Snapshot of runtime statistics. */
  getStats() {
    const mem = process.memoryUsage();
    return {
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
    };
  }

  /** Log a heartbeat and broadcast it on the event bus. */
  heartbeat() {
    const stats = this.getStats();
    this.logger.info('Health heartbeat', {
      uptime: stats.uptimeHuman,
      rssMb: stats.memory.rssMb,
      warnings: stats.totalWarnings,
      activeBans: stats.activeBans,
    });
    this.eventBus.emit(EVENTS.HEALTH, stats);
  }
}

export default HealthService;
