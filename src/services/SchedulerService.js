/**
 * @file SchedulerService — periodic jobs via node-cron.
 *  - Auto-unban: every minute, expire bans and DM rejoin links.
 *  - Backup: every `backupIntervalHours` hours.
 *  - Health: heartbeat every HEALTH_INTERVAL_MINUTES minutes.
 */

import cron from 'node-cron';
import { EVENTS, LIMITS } from '../config/constants.js';
import { unbanDmText } from '../utils/formatter.js';

export class SchedulerService {
  /**
   * @param {object} deps
   * @param {import('whatsapp-web.js').Client} deps.client
   * @param {object} deps.repos
   * @param {import('../services/ModerationService.js').ModerationService} deps.moderation
   * @param {import('../services/BackupService.js').BackupService} deps.backup
   * @param {import('../services/HealthService.js').HealthService} deps.health
   * @param {import('../config/env.js').config} deps.config
   * @param {import('winston').Logger} deps.logger
   * @param {import('../events/EventBus.js').EventBus} deps.eventBus
   * @param {{ service: import('./RaidService.js').RaidService, repo: import('../database/repositories/RaidRepository.js').RaidRepository }|null} [deps.raid]
   * @param {{ service: import('./StickerService.js').StickerService, repo: import('../database/repositories/StickerRepository.js').StickerRepository }|null} [deps.sticker]
   */
  constructor({ client, repos, moderation, backup, health, config, logger, eventBus, raid = null, sticker = null }) {
    this.client = client;
    this.repos = repos;
    this.moderation = moderation;
    this.backup = backup;
    this.health = health;
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    /** @type {{ service: import('./RaidService.js').RaidService, repo: import('../database/repositories/RaidRepository.js').RaidRepository }}|null} */
    this.raid = raid;
    /** @type {{ service: import('./StickerService.js').StickerService, repo: import('../database/repositories/StickerRepository.js').StickerRepository }}|null} */
    this.sticker = sticker;
    /** @type {import('node-cron').ScheduledTask[]} */
    this.jobs = [];
  }

  /** Register and start all cron jobs. */
  start() {
    // Auto-unban every minute.
    this.jobs.push(
      cron.schedule('* * * * *', () => {
        this.autoUnban().catch((e) => this.logger.error('autoUnban job failed', { error: e.message }));
      }),
    );

    // Backup every N hours (at minute 0).
    this.jobs.push(
      cron.schedule(`0 */${this.config.backupIntervalHours} * * *`, () => {
        try {
          this.backup.backup();
        } catch (e) {
          this.logger.error('backup job failed', { error: e.message });
        }
      }),
    );

    // Health heartbeat every few minutes.
    this.jobs.push(
      cron.schedule(`*/${LIMITS.HEALTH_INTERVAL_MINUTES} * * * *`, () => {
        try {
          this.health.heartbeat();
        } catch (e) {
          this.logger.error('health job failed', { error: e.message });
        }
      }),
    );

    // Anti-raid / anti-sticker housekeeping: expire Raid Mode past its duration
    // and prune transient tracking buffers every minute.
    if (this.raid?.service || this.sticker?.service) {
      this.jobs.push(
        cron.schedule('* * * * *', () => {
          this.housekeepingTick().catch((e) =>
            this.logger.error('housekeeping tick failed', { error: e.message }),
          );
        }),
      );
    }

    this.logger.info('Scheduler started', {
      jobs: this.jobs.length,
      backupEveryHours: this.config.backupIntervalHours,
    });
    this.eventBus.emit(EVENTS.HEALTH, { scheduler: 'started' });
  }

  /** Stop all cron jobs. */
  stop() {
    for (const job of this.jobs) job.stop();
    this.jobs = [];
    this.logger.info('Scheduler stopped.');
  }

  /**
   * Expire bans whose time has elapsed, removing them from the store and
   * DM-ing the user a rejoin link (if one is known for their group).
   */
  async autoUnban() {
    const now = Date.now();
    const expired = this.repos.bans.getExpired(now);
    for (const ban of expired) {
      try {
        await this.moderation.unbanUser(ban.userId);
        const link = this.repos.settings.getInviteLink(ban.groupId);
        if (link) {
          const text = unbanDmText({
            botName: this.config.botName,
            durationMs: this.config.banDuration,
            link,
          });
          await this.client.sendMessage(ban.userId, text);
        }
        this.logger.info('Auto-unbanned (expired)', { userId: ban.userId, groupId: ban.groupId });
      } catch (err) {
        this.logger.error('autoUnban entry failed', { userId: ban.userId, error: err.message });
      }
    }
  }

  /**
   * Housekeeping for the raid + sticker modules: expire Raid Mode past its
   * duration and prune transient tracking buffers so memory stays bounded.
   * Invoked every minute by cron.
   * @returns {Promise<void>}
   */
  async housekeepingTick() {
    const now = Date.now();
    for (const dep of [this.raid, this.sticker]) {
      if (!dep?.service) continue;
      try {
        dep.service.pruneAll(now);
      } catch (e) {
        this.logger.error('prune failed', { error: e.message });
      }
    }
    if (this.raid?.service) {
      try {
        const expired = await this.raid.service.expireRaidModes(now);
        for (const groupId of expired) {
          this.logger.info('Raid mode expired (auto)', { groupId });
        }
      } catch (e) {
        this.logger.error('raid expire failed', { error: e.message });
      }
    }
  }
}

export default SchedulerService;
