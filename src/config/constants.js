import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const LOG_DIR = path.join(ROOT_DIR, 'logs');

export const DB_FILES = Object.freeze({
 warnings: path.join(DATA_DIR, 'warnings.json'),
 bans: path.join(DATA_DIR, 'bans.json'),
 settings: path.join(DATA_DIR, 'settings.json'),
 badwords: path.join(DATA_DIR, 'badwords.json'),
 nsfw: path.join(DATA_DIR, 'nsfw.json'),
 advertisement: path.join(DATA_DIR, 'advertisement.json'),
 raid: path.join(DATA_DIR, 'raid.json'),
 sticker: path.join(DATA_DIR, 'sticker.json'),
  rules: path.join(DATA_DIR, 'rules.json'),
   audit: path.join(DATA_DIR, 'audit.json'),
   tickets: path.join(DATA_DIR, 'tickets.json'),
});

export const BACKUP_DIR = path.join(DATA_DIR, 'backups');

export const EVENTS = Object.freeze({
 WARNING_ISSUED: 'warning:issued',
 USER_BANNED: 'user:banned',
 USER_UNBANNED: 'user:unbanned',
 COMMAND_EXECUTED: 'command:executed',
 ERROR: 'error',
 CONNECTION: 'connection',
 HEALTH: 'health',
 STICKER_EVENT: 'sticker:event',
 RULE_CHANGED: 'rule:changed',
 SETTINGS_CHANGED: 'settings:changed',
 USER_KICKED: 'user:kicked',
 TOXICITY_DETECTED: 'toxicity:detected',
});

export const LIMITS = Object.freeze({
 SPAM_MESSAGE_COUNT: 5,
 SPAM_WINDOW_MS: 10_000,
 FLOOD_IDENTICAL_COUNT: 3,
 COMMAND_COOLDOWN_MS: 3_000,
 COMMAND_RATE_LIMIT: 10,
 COMMAND_RATE_WINDOW_MS: 60_000,
 BACKUP_INTERVAL_HOURS: 12,
 HEALTH_INTERVAL_MINUTES: 5,
 BACKUP_KEEP: 14,
 AUDIT_KEEP: 1000,
});

export const PUNISHMENTS = Object.freeze({
 LIST: Object.freeze(['Warn', 'Kick', 'TempBan', 'Ban']),
 DISPLAY: Object.freeze({ Warn: 'Warning', Kick: 'Kick', TempBan: 'TempBan', Ban: 'Ban' }),
});

export const RULE_SEVERITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

export const DEFAULTS = Object.freeze({
 warnings: { records: [] },
 bans: { records: [] },
 settings: { groupInviteLinks: {}, contactProfiles: {}, messagesSeen: 0, blockedMessages: 0 },
 audit: { records: [] },
badwords: {
 enabled: true,
 severity: {},
 config: {
  toxicThreshold: 3,
  cooldownDurationMs: 15000,
  negationWindow: 3,
  targetRequired: false,
 },
 negations: [],
 contextPatterns: {},
 targetPronouns: [],
 indonesian: [],
 english: [],
 slurs: [],
 hateSpeech: [],
 harassment: [],
 spamInsults: [],
 patterns: [],
 incidents: [],
},
 nsfw: {
 enabled: true,
 warnLimit: 3,
 highSeverityBan: true,
 categories: { sexual_terms: [], pornography: [], adult_services: [], sexual_harassment: [], adult_links: [], sex_toys: [] },
 incidents: [],
 },
 advertisement: {
 enabled: true,
 warnLimit: 3,
 highSeverityBan: true,
 categories: { selling: [], service_promotion: [] },
 exemptions: [],
 incidents: [],
 },
 raid: {
 enabled: true,
 autoRaidMode: true,
 raidModeDurationMs: 300_000,
 notifyAdmins: true,
 thresholds: {
 massJoin: { count: 10, windowMs: 60_000 },
 messageRaid: { count: 100, windowMs: 30_000 },
 coordinated: { minUsers: 3, windowMs: 15_000, similarity: 0.8 },
 newMemberAbuse: { windowMs: 60_000, minCount: 1 },
 },
 sensitivity: { raidMode: { massJoinMultiplier: 0.5, messageRaidMultiplier: 0.5, coordinatedMultiplier: 0.5 } },
 raidMode: {},
 incidents: [],
 },
 sticker: {
 enabled: true,
 maxStickers: 5,
 timeWindow: 15,
 duplicateLimit: 3,
 warnLimit: 3,
 coordinated: { minUsers: 5, windowSec: 10 },
 incidents: [],
 },
  rules: {
  rules: {
  R1: { title: 'Respect Everyone', description: 'Treat all members with respect. Harassment, insults, discrimination, intimidation, or abusive behavior are prohibited.', punishment: 'Warn', severity: 'medium', cooldown: 0, enabled: true },
  R2: { title: 'Respect Staff Decisions', description: 'Do not interfere with moderators or administrators while they are enforcing community rules.', punishment: 'Warn', severity: 'medium', cooldown: 0, enabled: true },
  R3: { title: 'Avoid Drama & Provocation', description: 'Do not intentionally create conflict, provoke arguments, spread rumors, or disrupt the community.', punishment: 'Warn', severity: 'medium', cooldown: 0, enabled: true },
  },
  },
  tickets: {
  records: [],
  },
});
