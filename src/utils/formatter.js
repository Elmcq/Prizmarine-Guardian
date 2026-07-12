/**
 * @file Message templates. Each function returns a plain string body.
 * Mention tokens (@<number>) are embedded so the caller can attach the
 * corresponding Contact objects via the `mentions` send option.
 */

import { humanizeDuration } from './time.js';
import { mentionToken } from './mentions.js';

/**
 * Warning message shown after a toxic/spam/flood offence.
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {number} p.count
 * @param {number} p.limit
 * @returns {string}
 */
export function warningText({ botName, userId, count, limit }) {
  return [
    '⚠️ *WARNING*',
    '',
    mentionToken(userId),
    '',
    'Toxic language detected.',
    '',
    `Warning: ${count}/${limit}`,
    '',
    'Please respect other members.',
  ].join('\n');
}

/**
 * Ban announcement shown in the group when the warning limit is reached.
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {number} p.durationMs
 * @returns {string}
 */
export function banText({ botName, userId, durationMs }) {
  const human = humanizeDuration(durationMs);
  return [
    '🚫 *PRIZMARINE GUARDIAN*',
    '',
    `${mentionToken(userId)} has reached the warning limit.`,
    '',
    'Action Taken:',
    '• Removed from group',
    `• ${human} ban`,
  ].join('\n');
}

/**
 * Direct message sent to a user when their timed ban expires.
 * @param {object} p
 * @param {string} p.botName
 * @param {number} p.durationMs
 * @param {string} [p.link]
 * @returns {string}
 */
export function unbanDmText({ botName, durationMs, link }) {
  const human = humanizeDuration(durationMs);
  const lines = [
    `Your ${human} ban has expired.`,
  ];
  if (link) lines.push('You may rejoin using the invite link:', link);
  else lines.push('You may now rejoin the group.');
  return lines.join('\n');
}

/** Short reply when a non-admin tries an admin-only command. */
export const UNAUTHORIZED_TEXT =
  '🚫 This command is admin-only. Ask a group admin for help.';

/**
 * Cooldown notice.
 * @param {number} seconds
 * @returns {string}
 */
export function cooldownText(seconds) {
  return `⏳ Please wait ${seconds} second${seconds === 1 ? '' : 's'} before using commands again.`;
}

/** Generic command usage hint. */
export function usageText(prefix, name, usage) {
  return `ℹ️ Usage: ${prefix}${name} ${usage || ''}`.trim();
}

/**
 * NSFW warning message shown after a low/medium severity detection.
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {number} p.count
 * @param {number} p.limit
 * @param {string} p.category
 * @param {string} p.severity
 * @param {string} [p.reason]
 * @returns {string}
 */
export function nsfwWarningText({ botName, userId, count, limit, category, severity, reason }) {
  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : category;
  const severityLabel = severity
    ? severity.charAt(0).toUpperCase() + severity.slice(1)
    : severity;
  return [
    '🔞 *PRIZMARINE GUARDIAN*',
    '',
    '⚠️ Warning',
    '',
    mentionToken(userId),
    '',
    'Your message contains inappropriate NSFW content.',
    '',
    `Category:\n${categoryLabel}`,
    `Severity:\n${severityLabel}`,
    `Reason:\n${reason || 'Detected prohibited adult content.'}`,
    '',
    `Warning:\n${count}/${limit}`,
    '',
    'Please respect the community rules.',
  ].join('\n');
}

/**
 * NSFW ban message shown for high-severity detections.
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {string} p.reason
 * @returns {string}
 */
export function nsfwBanText({ botName, userId, reason }) {
  return [
    '🚫 *PRIZMARINE GUARDIAN*',
    '',
    mentionToken(userId),
    '',
    'High severity NSFW content has been detected.',
    '',
    'Action Taken:',
    '• Removed from group',
    '• 24 Hour Ban',
    '',
    `Reason:\n${reason || 'Distribution of explicit adult content.'}`,
  ].join('\n');
}

/**
 * Advertisement warning message shown after a low/medium severity detection.
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {number} p.count
 * @param {number} p.limit
 * @param {string} p.category
 * @param {string} p.severity
 * @param {string} [p.reason]
 * @returns {string}
 */
export function adWarningText({ botName, userId, count, limit, category, severity, reason }) {
  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : category;
  const severityLabel = severity
    ? severity.charAt(0).toUpperCase() + severity.slice(1)
    : severity;
  return [
    '📢 *PRIZMARINE GUARDIAN*',
    '',
    '⚠️ Warning',
    '',
    mentionToken(userId),
    '',
    'Your message was flagged as a commercial advertisement.',
    '',
    `Category:\n${categoryLabel}`,
    `Severity:\n${severityLabel}`,
    `Reason:\n${reason || 'Detected commercial advertisement.'}`,
    '',
    `Warning:\n${count}/${limit}`,
    '',
    'Please respect the community rules.',
  ].join('\n');
}

/**
 * Advertisement ban message shown for high-severity detections
 * (repeated or mass commercial advertisement).
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {string} p.reason
 * @returns {string}
 */
export function adBanText({ botName, userId, reason }) {
  return [
    '🚫 *PRIZMARINE GUARDIAN*',
    '',
    mentionToken(userId),
    '',
    'Repeated or mass commercial advertisement detected.',
    '',
    'Action Taken:',
    '• Removed from group',
    '• 24 Hour Ban',
    '',
    `Reason:\n${reason || 'Repeated commercial advertisement.'}`,
  ].join('\n');
}

/**
 * Raid-mode ban message (new-member abuse, coordinated spam, mass raid).
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {string} p.reason
 * @returns {string}
 */
export function raidBanText({ botName, userId, reason }) {
  return [
    '🚨 *PRIZMARINE GUARDIAN*',
    '',
    mentionToken(userId),
    '',
    'Raid activity detected.',
    '',
    'Action Taken:',
    '• Removed from group',
    '• 24 Hour Ban',
    '',
    `Reason:\n${reason || 'Participating in a group raid.'}`,
  ].join('\n');
}

/**
 * Admin notification sent when Raid Mode is activated.
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.groupId
 * @param {string[]} p.triggers - triggered raid types.
 * @returns {string}
 */
export function raidAlertText({ botName, groupId, triggers }) {
  return [
    '🚨 *RAID MODE ACTIVATED*',
    '',
    `Group: ${groupId}`,
    '',
    'Triggered by:',
    ...triggers.map((t) => `• ${t}`),
    '',
    'Moderation sensitivity is increased while Raid Mode is active.',
    'Use `!raidmode off` to disable manually, or wait for auto-expiry.',
  ].join('\n');
}

/**
 * Sticker-spam warning message (flood or duplicate).
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {number} p.count
 * @param {number} p.limit
 * @param {'flood'|'duplicate'} p.type
 * @param {string} [p.reason]
 * @returns {string}
 */
export function stickerWarningText({ botName, userId, count, limit, type, reason }) {
  const typeLabel = type === 'duplicate' ? 'Duplicate sticker spam' : 'Sticker flood';
  return [
    '💠 *PRIZMARINE GUARDIAN*',
    '',
    '⚠️ Warning',
    '',
    mentionToken(userId),
    '',
    'Your sticker activity was flagged as spam.',
    '',
    `Type:\n${typeLabel}`,
    `Reason:\n${reason || typeLabel}`,
    '',
    `Warning:\n${count}/${limit}`,
    '',
    'Please respect the community rules.',
  ].join('\n');
}

/**
 * Sticker-spam ban message (reaching the warning limit).
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {string} p.reason
 * @returns {string}
 */
export function stickerBanText({ botName, userId, reason }) {
  return [
    '🚫 *PRIZMARINE GUARDIAN*',
    '',
    mentionToken(userId),
    '',
    'Repeated sticker spam detected.',
    '',
    'Action Taken:',
    '• Removed from group',
    '• 24 Hour Ban',
    '',
    `Reason:\n${reason || 'Sticker spam.'}`,
  ].join('\n');
}

/**
 * Unified moderation notice used by `!warn` / `!kick` / `!ban` / `!tempban`
 * when a rule is (or is not) referenced. The `Rule Violated` block only
 * appears when `ruleId` is supplied.
 *
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {string} p.action - Display label ("Warning" | "Kick" | "TempBan" | "Ban").
 * @param {string} [p.ruleId]
 * @param {string} [p.ruleTitle]
 * @param {string} [p.reason]
 * @param {string} [p.moderatorId]
 * @param {number} [p.durationMs] - For TempBan, shown as a human duration.
 * @returns {string}
 */
export function moderationActionText({
  botName,
  userId,
  action,
  ruleId,
  ruleTitle,
  reason,
  moderatorId,
  durationMs,
}) {
  const lines = ['⚠️ *PRIZMARINE GUARDIAN MODERATION*', ''];
  lines.push('User:');
  lines.push(mentionToken(userId));
  lines.push('');
  lines.push('Action:');
  lines.push(action || 'Warning');
  if (action === 'TempBan' && Number.isFinite(durationMs)) {
    lines.push('');
    lines.push('Duration:');
    lines.push(humanizeDuration(durationMs));
  }
  if (ruleId) {
    lines.push('');
    lines.push('Rule Violated:');
    lines.push(`${ruleId} • ${ruleTitle || ''}`.trim());
  }
  lines.push('');
  lines.push('Reason:');
  lines.push(reason || '—');
  if (moderatorId) {
    lines.push('');
    lines.push('Moderator:');
    lines.push(mentionToken(moderatorId));
  }
  return lines.join('\n');
}

/**
 * List of all community rules (used by `!rules`).
 * @param {object} p
 * @param {string} p.botName
 * @param {Array<{id:string, title:string}>} p.rules
 * @returns {string}
 */
export function ruleListText({ botName, rules }) {
  const lines = ['📜 *Community Rules*', ''];
  if (!rules.length) {
    lines.push('_No rules have been configured yet._');
  } else {
    for (const r of rules) {
      lines.push(`${r.id} • ${r.title}`);
    }
  }
  return lines.join('\n');
}

/**
 * Full detail of a single rule (used by `!rule R2`).
 * @param {object} p
 * @param {object} p.rule - { id, title, description, punishment }
 * @returns {string}
 */
export function ruleDetailText({ rule }) {
  return [
    'Rule:',
    rule.id,
    '',
    'Title:',
    rule.title,
    '',
    'Description:',
    rule.description,
    '',
    'Default Punishment:',
    rule.punishment,
  ].join('\n');
}

/**
 * Success acknowledgement for `!addrule`.
 * @param {object} p
 * @param {string} p.id
 * @param {{ title:string, punishment:string }} p.rule
 * @returns {string}
 */
export function ruleAddedText({ id, rule }) {
  return [
    '✅ Rule Added Successfully',
    '',
    `${id} • ${rule.title}`,
    `Punishment: ${rule.punishment}`,
  ].join('\n');
}

/**
 * Success acknowledgement for `!deleterule`.
 * @param {object} p
 * @param {string} p.id
 * @returns {string}
 */
export function ruleDeletedText({ id }) {
  return [`🗑 Rule Deleted Successfully`, '', `Rule ${id} was removed.`].join('\n');
}

/**
 * Default kick notice (used by `!kick` when no rule is referenced).
 * @param {object} p
 * @param {string} p.botName
 * @param {string} p.userId
 * @param {string} [p.reason]
 * @returns {string}
 */
export function kickText({ botName, userId, reason }) {
  return [
    '🦶 *PRIZMARINE GUARDIAN KICK*',
    '',
    mentionToken(userId),
    '',
    'You have been removed from the group.',
    '',
    `Reason:\n${reason || 'Removed by a moderator.'}`,
  ].join('\n');
}

