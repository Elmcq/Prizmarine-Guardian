/**
 * @file Small time-formatting helpers.
 */

/**
 * Humanise a millisecond duration into a short string.
 * @param {number} ms
 * @returns {string} e.g. "24 hours", "10 seconds", "1 minute 30 seconds".
 */
export function humanizeDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0 seconds';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds && parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  return parts.slice(0, 2).join(' ') || '0 seconds';
}

/**
 * Format a UNIX-ms timestamp as a local datetime string.
 * @param {number} ms
 * @returns {string}
 */
export function formatTimestamp(ms) {
  return new Date(ms).toLocaleString();
}

/**
 * Parse a short human duration token into milliseconds.
 * Supports `w` (weeks), `d` (days), `h` (hours) and `m` (minutes), e.g.
 * `"7d"`, `"12h"`, `"30m"`, `"1w"`. Returns `null` if the token is invalid.
 * @param {string} str
 * @returns {number|null}
 */
export function parseDuration(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d+)\s*([dhmw])$/i.exec(str.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const mult = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return n * mult[m[2].toLowerCase()];
}
