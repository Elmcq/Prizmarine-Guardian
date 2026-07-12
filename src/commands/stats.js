import { panelText } from './messages.js';

export default {
 name: 'stats',
 description: 'Show bot statistics (uptime, memory, warnings, bans).',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const s = ctx.services.health.getStats();
 const ns = ctx.repos.nsfw?.getStats?.() || { detections: 0, warnings: 0, bans: 0, mostTriggeredCategory: null };
 const ad = ctx.repos.advertisement?.getStats?.() || { detections: 0, warnings: 0, bans: 0, mostTriggeredCategory: null };
 const raid = ctx.repos.raid?.getStats?.() || { total: 0, byType: {}, activeRaidModes: 0 };
 const sticker = ctx.repos.sticker?.getStats?.() || { total: 0, byType: {}, warnings: 0, logs: 0 };
 const rules = ctx.repos.rules?.getStats?.() || { total: 0, byPunishment: {} };
 const punishmentBreakdown = Object.entries(rules.byPunishment).map(([punishment, count]) => `${punishment}: ${count}`).join(', ');
 const lines = [`Uptime: ${s.uptimeHuman}`, `Messages seen: ${s.messagesSeen}`, `Warnings: ${s.totalWarnings}`, `Active bans: ${s.activeBans}`, `Memory: ${s.memory.rssMb} MB RSS`, '', `Anti-NSFW: ${ns.detections} detected, ${ns.warnings} warned, ${ns.bans} banned`, `Top NSFW category: ${ns.mostTriggeredCategory || 'None'}`, '', `Anti-Advertisement: ${ad.detections} detected, ${ad.warnings} warned, ${ad.bans} banned`, `Top ad category: ${ad.mostTriggeredCategory || 'None'}`, '', `Raid incidents: ${raid.total}`, `Active raid modes: ${raid.activeRaidModes}`, '', `Sticker incidents: ${sticker.total}`, `Sticker warnings: ${sticker.warnings}`, `Log-only sticker events: ${sticker.logs}`, '', `Rules: ${rules.total}`, `Punishments: ${punishmentBreakdown || 'None'}`];
 await ctx.message.reply(panelText('Guardian Status', lines, '📊'));
 },
};
