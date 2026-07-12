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
import { AuditRepository } from './database/repositories/AuditRepository.js';
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
import { AuditService } from './services/AuditService.js';
import { ContactResolver } from './services/ContactResolver.js';
import { registerMessageHandler } from './handlers/messageHandler.js';
import { registerReadyHandler } from './handlers/readyHandler.js';
import { registerConnectionHandlers } from './handlers/authFailureHandler.js';
import { registerNSFWHandler } from './handlers/nsfwHandler.js';
import { registerAdvertisementHandler } from './handlers/advertisementHandler.js';
import { registerRaidHandler } from './handlers/raidHandler.js';
import { registerStickerHandler } from './handlers/stickerHandler.js';
import { commandRegistry } from './commands/index.js';
import { createDashboard } from './web/dashboard.js';

const START_TIME = Date.now();

async function bootstrap() {
 logger.info(`Starting ${config.botName}...`, { node: process.version, warnLimit: config.warnLimit, banDuration: config.banDuration });
 const db = new DatabaseService();
 await db.init();
 const badwords = new BadwordRepository(db);
 const repos = {
 warnings: new WarningRepository(db),
 bans: new BanRepository(db),
 settings: new SettingsRepository(db),
 badwords,
 toxicity: badwords,
 nsfw: new NSFWRepository(db),
 advertisement: new AdvertisementRepository(db),
 raid: new RaidRepository(db),
 sticker: new StickerRepository(db),
 rules: new RuleRepository(db),
 audit: new AuditRepository(db),
 };

 const toxicity = new ToxicityService(badwords);
 const nsfwService = new NSFWService(repos.nsfw);
 const advertisementService = new AdvertisementService(repos.advertisement);
 const raidService = new RaidService(repos.raid);
 const stickerService = new StickerService(repos.sticker);
 const spam = new SpamService({ spamCount: config.spamCount, spamWindow: config.spamWindow, floodCount: config.floodCount });
 const rateLimiter = new RateLimiter({ cooldownMs: config.commandCooldown, limit: config.commandRateLimit, windowMs: config.commandRateWindow });
 const health = new HealthService(logger, eventBus, repos, START_TIME);
 const moderation = new ModerationService({ config, logger, eventBus, warnings: repos.warnings, bans: repos.bans, settings: repos.settings, health });
 const ruleService = new RuleService({ repo: repos.rules, logger, eventBus });
 const permissionService = new PermissionService({ config });
 const audit = new AuditService({ repo: repos.audit, eventBus, logger }).start();
 const backup = new BackupService(db, { keep: 14 });

 const client = new Client({
 authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
 puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] },
 });
 moderation.setClient(client);
 permissionService.setClient(client);
 const contactResolver = new ContactResolver(client, logger, repos.settings);

 const services = { toxicity, nsfw: nsfwService, advertisement: advertisementService, raid: raidService, sticker: stickerService, spam, moderation, health, backup, rule: ruleService, permission: permissionService, audit };

 registerMessageHandler({ client, repos, services, config, logger, eventBus, rateLimiter, commandRegistry, contactResolver });
 registerNSFWHandler({ client, repos, services, config, logger, eventBus, nsfwService });
 registerAdvertisementHandler({ client, repos, services, config, logger, eventBus, advertisementService });
 registerRaidHandler({ client, repos, services, config, logger, eventBus, raidService });
 registerStickerHandler({ client, repos, services, config, logger, eventBus, stickerService });
 registerReadyHandler({ client, repos, logger, eventBus, config });
 registerConnectionHandlers({ client, logger, eventBus });

 client.on('qr', (qr) => {
 qrcode.generate(qr, { small: true });
 logger.info('QR code generated. Scan it with WhatsApp to authenticate.');
 });
 client.on('authenticated', () => logger.info('Session authenticated.'));
 client.on('auth_failure', (msg) => logger.error('Auth failure', { msg }));

 const scheduler = new SchedulerService({ client, repos, moderation, backup, health, config, logger, eventBus, raid: { service: raidService, repo: repos.raid }, sticker: { service: stickerService, repo: repos.sticker } });
 scheduler.start();

 let dashboardServer = null;
 if (config.dashboardToken) {
 try {
 const app = createDashboard({ repos, services, config, logger, eventBus, contactResolver });
 dashboardServer = app.listen(config.dashboardPort, config.dashboardHost, () => logger.info(`Dashboard listening on http://${config.dashboardHost}:${config.dashboardPort}`));
 } catch (err) {
 logger.error('Failed to start dashboard', { error: err.message });
 }
 } else {
 logger.info('Dashboard disabled (set DASHBOARD_TOKEN in .env to enable).');
 }

 let shuttingDown = false;
 async function shutdown(signal) {
 if (shuttingDown) return;
 shuttingDown = true;
 logger.info(`Received ${signal}. Shutting down gracefully...`);
 try {
 if (dashboardServer) dashboardServer.close();
 scheduler.stop();
 audit.stop();
 await client.destroy();
 } catch (err) {
 logger.error('Error during shutdown', { error: err.message });
 }
 logger.info('Goodbye.');
 process.exit(0);
 }
 process.on('SIGINT', () => shutdown('SIGINT'));
 process.on('SIGTERM', () => shutdown('SIGTERM'));
 process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', { reason: String(reason) }));
 process.on('uncaughtException', (err) => logger.error('Uncaught exception', { error: err.message, stack: err.stack }));
 await client.initialize();
}

bootstrap().catch((err) => {
 logger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
 process.exit(1);
});
