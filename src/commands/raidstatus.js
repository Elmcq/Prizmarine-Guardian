import { humanizeDuration } from '../utils/time.js';
import { statusText } from './messages.js';

export default {
 name: 'raidstatus',
 description: 'Show Anti Raid configuration and current Raid Mode state.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const repo = ctx.repos.raid;
 const s = repo.getSettings();
 const stats = repo.getStats();
 const raidModeMap = repo.getRaidModeMap();
 const details = [`Auto mode: ${s.autoRaidMode ? 'Enabled' : 'Disabled'}`, `Mode duration: ${humanizeDuration(s.raidModeDurationMs)}`, `Admin alerts: ${s.notifyAdmins ? 'Enabled' : 'Disabled'}`, '', 'Thresholds:', `• Mass join: ${s.thresholds.massJoin.count} users / ${humanizeDuration(s.thresholds.massJoin.windowMs)}`, `• Message raid: ${s.thresholds.messageRaid.count} messages / ${humanizeDuration(s.thresholds.messageRaid.windowMs)}`, `• Coordinated: ${s.thresholds.coordinated.minUsers} users / ${humanizeDuration(s.thresholds.coordinated.windowMs)}`, `• New-member window: ${humanizeDuration(s.thresholds.newMemberAbuse.windowMs)}`, '', `Active raid modes: ${stats.activeRaidModes}`];
 const activeGroups = Object.entries(raidModeMap).filter(([, state]) => state && state.active);
 for (const [groupId, state] of activeGroups) details.push(`• ${groupId}: ${humanizeDuration(state.until ? Math.max(0, state.until - Date.now()) : 0)} left`);
 const recent = repo.getIncidents().slice(-10).reverse();
 details.push('', 'Recent incidents:');
 if (!recent.length) details.push('• None');
 else for (const incident of recent) details.push(`• ${incident.type} @ ${incident.group || '?'}`);
 await ctx.message.reply(statusText('Anti-Raid', s.enabled, details));
 },
};
