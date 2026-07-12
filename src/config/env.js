/**
 * @file Loads, normalises and validates environment configuration.
 * Exposes a frozen {@link config} object used across the whole application.
 * Throws at import time if a required variable is missing.
 */

import dotenv from 'dotenv';
import { LIMITS } from './constants.js';

dotenv.config();

/**
 * Normalise a WhatsApp id (number) into a full WhatsApp id (`…@c.us`).
 * @param {string} value - Raw value from env.
 * @returns {string} Normalised id.
 */
function normalizeWid(value) {
  if (!value) return '';
  return value.includes('@') ? value : `${value}@c.us`;
}

/**
 * Parse an env value as a positive number, falling back to a default.
 * @param {string|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const config = Object.freeze({
  botName: process.env.BOT_NAME || 'Prizmarine Guardian',
  prefix: process.env.PREFIX || '!',
  owner: normalizeWid(process.env.OWNER || ''),
  ownerLid: (process.env.OWNER_LID || '').trim(),
  warnLimit: parsePositiveInt(process.env.WARN_LIMIT, 3),
  banDuration: parsePositiveInt(process.env.BAN_DURATION, 86_400_000),
  logLevel: process.env.LOG_LEVEL || 'info',

  // Behavioural limits (env overrides come first, then constants).
  spamCount: parsePositiveInt(process.env.SPAM_MESSAGE_COUNT, LIMITS.SPAM_MESSAGE_COUNT),
  spamWindow: parsePositiveInt(process.env.SPAM_WINDOW_MS, LIMITS.SPAM_WINDOW_MS),
  floodCount: parsePositiveInt(process.env.FLOOD_IDENTICAL_COUNT, LIMITS.FLOOD_IDENTICAL_COUNT),
  commandCooldown: parsePositiveInt(process.env.COMMAND_COOLDOWN_MS, LIMITS.COMMAND_COOLDOWN_MS),
  commandRateLimit: parsePositiveInt(process.env.COMMAND_RATE_LIMIT, LIMITS.COMMAND_RATE_LIMIT),
  commandRateWindow: parsePositiveInt(process.env.COMMAND_RATE_WINDOW_MS, LIMITS.COMMAND_RATE_WINDOW_MS),
  backupIntervalHours: parsePositiveInt(process.env.BACKUP_INTERVAL_HOURS, LIMITS.BACKUP_INTERVAL_HOURS),

  // Web dashboard (optional). The dashboard only starts when DASHBOARD_TOKEN
  // is set to a non-empty string; otherwise the bot runs without it.
  dashboardPort: parsePositiveInt(process.env.DASHBOARD_PORT, 3000),
  dashboardHost: process.env.DASHBOARD_HOST || '0.0.0.0',
  dashboardToken: process.env.DASHBOARD_TOKEN || '',
});

// Fail fast if a misconfiguration would silently break moderation.
if (!config.owner) {
  throw new Error(
    'Missing required env var OWNER. Set OWNER to the bot owner\'s number ' +
      '(e.g. 6281234567890) in your .env file.',
  );
}

export default config;
