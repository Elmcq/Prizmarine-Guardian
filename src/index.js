/**
 * @file Application entrypoint.
 *
 * Boots the logger, configuration, JSON "database", repositories and
 * services, then constructs the whatsapp-web.js Client (LocalAuth), wires
 * the event handlers and scheduled jobs, and handles graceful shutdown.
 *
 * The bot is event-driven: WhatsApp events flow into handlers, which call
 * services; services emit domain events on the EventBus for central logging.
 */

// whatsapp-web.js is a CommonJS package; import the default export and
// destructure the named members (named ESM imports are not supported).
import wa from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = wa;

import { config } from './config/env.js';
import { logger } from './logger/winston.js';
import { eventBus } from './events/EventBus.js';
import { DatabaseService } from './database/DatabaseService.js';
import { WarningRepository } from './database/repositories/WarningRepository.js';
import { BanRepository } from './database/repositories/BanRepository.js';
import { SettingsRepository } from './database/repositories/SettingsRepository.js';
import { BadwordRepository } from './database/repositories/BadwordRepository.js';
import { NSFWRepository } from './database/repositories/NSFWRepository.js';
import { AdvertisementRepository } from './database/repositories/AdvertisementRepository.js';
import { RaidRepository } from './database/repositories/RaidRepository.js';
import { StickerRepository } from './database/repositories/StickerRepository.js';
import { RuleRepository } from './database/repositories/RuleRepository.js';

import { ToxicityService } from './services/ToxicityService.js';
import { ModerationService } from './services/ModerationService.js';
import { SpamService } from './services/SpamService.js';
import { RateLimiter } from './services/RateLimiter.js';
import { BackupService } from './services/BackupService.js';
import { HealthService } from './services/HealthService.js';
import { SchedulerService } from './services/SchedulerService.js';
import { NSFWService } from './services/NSFWService.js';
import { AdvertisementService } from './services/AdvertisementService.js';
import { RaidService } from './services/RaidService.js';
import { StickerService } from './services/StickerService.js';
import { RuleService } from './services/RuleService.js';
import { PermissionService } from './services/PermissionService.js';

import { registerMessageHandler } from './handlers/messageHandler.js';
import { registerReadyHandler } from './handlers/readyHandler.js';
import { registerConnectionHandlers } from './handlers/authFailureHandler.js';
import { registerNSFWHandler } from './handlers/nsfwHandler.js';
import { registerAdvertisementHandler } from './handlers/advertisementHandler.js';
import { registerRaidHandler } from './handlers/raidHandler.js';
import { registerStickerHandler } from './handlers/stickerHandler.js';
import { commandRegistry } from './commands/index.js';

const START_TIME = Date.now();

/**
 * Build the dependency graph and start the bot.
 * @returns {Promise<void>}
 */
async function bootstrap() {
  logger.info(`Starting ${config.botName}...`, {
    node: process.version,
    warnLimit: config.warnLimit,
    banDuration: config.banDuration,
  });

  // --- Persistence ---
  const db = new DatabaseService();
  await db.init();

  const repos = {
    warnings: new WarningRepository(db),
    bans: new BanRepository(db),
    settings: new SettingsRepository(db),
    badwords: new BadwordRepository(db),
    nsfw: new NSFWRepository(db),
    advertisement: new AdvertisementRepository(db),
    raid: new RaidRepository(db),
    sticker: new StickerRepository(db),
    rules: new RuleRepository(db),
  };

  // --- Services ---
  const toxicity = new ToxicityService(repos.badwords);
  const nsfwService = new NSFWService(repos.nsfw);
  const advertisementService = new AdvertisementService(repos.advertisement);
  const raidService = new RaidService(repos.raid);
  const stickerService = new StickerService(repos.sticker);
  const spam = new SpamService({
    spamCount: config.spamCount,
    spamWindow: config.spamWindow,
    floodCount: config.floodCount,
  });
  const rateLimiter = new RateLimiter({
    cooldownMs: config.commandCooldown,
    limit: config.commandRateLimit,
    windowMs: config.commandRateWindow,
  });
  const health = new HealthService(logger, eventBus, repos, START_TIME);
  const moderation = new ModerationService({
    config,
    logger,
    eventBus,
    warnings: repos.warnings,
    bans: repos.bans,
    health,
  });
  const ruleService = new RuleService({ repo: repos.rules, logger, eventBus });
  const permissionService = new PermissionService({ config });
  const backup = new BackupService(db, { keep: 14 });

  // --- WhatsApp client ---
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  });
  moderation.setClient(client);
  permissionService.setClient(client);

  const services = { toxicity, nsfw: nsfwService, advertisement: advertisementService, raid: raidService, sticker: stickerService, spam, moderation, health, backup, rule: ruleService, permission: permissionService };

  // --- Handlers ---
  registerMessageHandler({
    client,
    repos,
    services,
    config,
    logger,
    eventBus,
    rateLimiter,
    commandRegistry,
  });
  registerNSFWHandler({ client, repos, services, config, logger, eventBus, nsfwService });
  registerAdvertisementHandler({ client, repos, services, config, logger, eventBus, advertisementService });
  registerRaidHandler({ client, repos, services, config, logger, eventBus, raidService });
  registerStickerHandler({ client, repos, services, config, logger, eventBus, stickerService });
  registerReadyHandler({ client, repos, logger, eventBus, config });
  registerConnectionHandlers({ client, logger, eventBus });

  // --- QR authentication ---
  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    logger.info('QR code generated — scan it with WhatsApp to authenticate.');
  });

  client.on('authenticated', () => logger.info('Session authenticated.'));
  client.on('auth_failure', (msg) => logger.error('Auth failure', { msg }));

  // --- Scheduler ---
  const scheduler = new SchedulerService({
    client,
    repos,
    moderation,
    backup,
    health,
    config,
    logger,
    eventBus,
    raid: { service: raidService, repo: repos.raid },
    sticker: { service: stickerService, repo: repos.sticker },
  });
  scheduler.start();

  // --- Graceful shutdown ---
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      scheduler.stop();
      await client.destroy();
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
    }
    logger.info('Goodbye.');
    process.exit(0);
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // --- Crash safety ---
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  });

  // --- Go ---
  await client.initialize();
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
  process.exit(1);
});
