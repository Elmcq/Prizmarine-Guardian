/**
 * @file Centralised constants: file paths, event names, default limits.
 * Keeping magic strings/numbers here makes the rest of the codebase
 * declarative and easy to tune from a single place.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Project root (two levels up from src/config). */
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

/** Directory that holds the JSON "database" files. */
export const DATA_DIR = path.join(ROOT_DIR, 'data');

/** Directory that holds Winston log files. */
export const LOG_DIR = path.join(ROOT_DIR, 'logs');

/** Absolute paths to each persisted JSON file. */
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
});

/** Directory where timestamped backups are written. */
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');

/**
 * Event names emitted on the EventBus. Decoupling actions from logging
 * (and any future listeners) keeps services free of logging side-effects.
 */
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
  USER_KICKED: 'user:kicked',
});

/**
 * Tunable behavioural limits. Values here are defaults; where a matching
 * value exists in the .env it is overridden by config (see src/config/env.js).
 */
export const LIMITS = Object.freeze({
  // Anti-spam: >= 5 messages within 10 seconds from the same user.
  SPAM_MESSAGE_COUNT: 5,
  SPAM_WINDOW_MS: 10_000,

  // Anti-flood: >= 3 identical consecutive messages from the same user.
  FLOOD_IDENTICAL_COUNT: 3,

  // Command abuse protection.
  COMMAND_COOLDOWN_MS: 3_000,
  COMMAND_RATE_LIMIT: 10,
  COMMAND_RATE_WINDOW_MS: 60_000,

  // Backup cadence (hours).
  BACKUP_INTERVAL_HOURS: 12,

  // Health heartbeat cadence (minutes).
  HEALTH_INTERVAL_MINUTES: 5,

  // Number of most-recent backups to retain.
  BACKUP_KEEP: 14,
});

/**
 * Supported rule punishments. Rule management rejects anything outside this
 * list and uses the `DISPLAY` map to render human-friendly action labels.
 */
export const PUNISHMENTS = Object.freeze({
  LIST: Object.freeze(['Warn', 'Kick', 'TempBan', 'Ban']),
  DISPLAY: Object.freeze({
    Warn: 'Warning',
    Kick: 'Kick',
    TempBan: 'TempBan',
    Ban: 'Ban',
  }),
});

/** Default data shapes written when a JSON file does not yet exist. */
export const DEFAULTS = Object.freeze({
  warnings: { records: [] },
  bans: { records: [] },
  settings: { groupInviteLinks: {}, messagesSeen: 0 },
  badwords: {
    indonesian: [],
    english: [],
    slurs: [],
    hateSpeech: [],
    harassment: [],
    spamInsults: [],
    patterns: [],
  },
  nsfw: {
    enabled: true,
    warnLimit: 3,
    highSeverityBan: true,
    categories: {
      sexual_terms: [],
      pornography: [],
      adult_services: [],
      sexual_harassment: [],
      adult_links: [],
      sex_toys: [],
    },
    incidents: [],
  },
  advertisement: {
    enabled: true,
    warnLimit: 3,
    highSeverityBan: true,
    categories: {
      selling: [],
      service_promotion: [],
    },
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
    sensitivity: {
      raidMode: {
        massJoinMultiplier: 0.5,
        messageRaidMultiplier: 0.5,
        coordinatedMultiplier: 0.5,
      },
    },
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
      R1: {
        title: 'Respect Everyone',
        description:
          'Treat all members with respect. Harassment, insults, discrimination, intimidation, or abusive behavior are prohibited.',
        punishment: 'Warn',
      },
      R2: {
        title: 'Respect Staff Decisions',
        description:
          'Do not interfere with moderators or administrators while they are enforcing community rules.',
        punishment: 'Warn',
      },
      R3: {
        title: 'Avoid Drama & Provocation',
        description:
          'Do not intentionally create conflict, provoke arguments, spread rumors, or disrupt the community.',
        punishment: 'Warn',
      },
    },
  },
});
