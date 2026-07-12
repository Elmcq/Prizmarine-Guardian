import { humanizeDuration } from '../utils/time.js';
import { mentionToken } from '../utils/mentions.js';

const DIVIDER = '━━━━━━━━━━━━━━';

export function successText(action, status = 'Completed', details = 'No additional details.') {
 return ['✅ *Success*', '', DIVIDER, `Action: ${action}`, `Status: ${status}`, `Details: ${details}`, DIVIDER].join('\n');
}

export function errorText(reason, required = 'Check the command and try again.') {
 return ['❌ *Error*', '', DIVIDER, `Reason: ${reason}`, `Required: ${required}`, DIVIDER].join('\n');
}

export function warningText(user, reason, action) {
 return ['⚠️ *Warning*', '', DIVIDER, `User: ${user}`, `Reason: ${reason}`, `Action: ${action}`, DIVIDER].join('\n');
}

export function moderationText({ userId, action, reason, moderatorId, ruleId, ruleTitle, durationMs }) {
 const lines = ['🛡️ *Moderation Action*', '', DIVIDER, `User: ${mentionToken(userId)}`, `Action: ${action || 'Warning'}`, `Reason: ${reason || 'Not specified'}`];
 if (ruleId) lines.push(`Rule: ${ruleId} • ${ruleTitle || 'Untitled'}`);
 if (action === 'TempBan' && Number.isFinite(durationMs)) lines.push(`Duration: ${humanizeDuration(durationMs)}`);
 lines.push(`Moderator: ${moderatorId ? mentionToken(moderatorId) : 'Prizmarine Guardian'}`, DIVIDER);
 return lines.join('\n');
}

export function rulesText(lines) {
 return ['📜 *Guardian Rules*', '', DIVIDER, ...lines, DIVIDER].join('\n');
}

export function statusText(module, enabled, details = []) {
 const active = enabled === true || String(enabled).toLowerCase() === 'enabled';
 return ['📊 *Module Status*', '', DIVIDER, `${active ? '🟢' : '🔴'} ${module}`, active ? 'Enabled' : 'Disabled', ...details, DIVIDER].join('\n');
}

export function panelText(title, lines, icon = '📊') {
 return [`${icon} *${title}*`, '', DIVIDER, ...lines, DIVIDER].join('\n');
}

export function usageText(prefix, name, usage = '') {
 return errorText('Invalid command usage.', `Use: ${prefix}${name}${usage ? ` ${usage}` : ''}`);
}

export const OWNER_ONLY = errorText('Owner access required.', 'Only the bot owner can use this command.');
export const GROUP_ONLY = errorText('This command only works in groups.', 'Run this command inside a WhatsApp group.');
