import { statusText } from './messages.js';

export default {
 name: 'stickerstatus',
 description: 'Show Anti Sticker Spam configuration and recent incidents.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const s = ctx.repos.sticker.getSettings();
 const stats = ctx.repos.sticker.getStats();
 const recent = ctx.repos.sticker.getIncidents().slice(-10).reverse();
 const details = [`Flood limit: ${s.maxStickers} stickers / ${s.timeWindow}s`, `Duplicate limit: ${s.duplicateLimit} identical stickers`, `Warning limit: ${s.warnLimit}`, `Coordinated monitoring: ${s.coordinated.minUsers} users / ${s.coordinated.windowSec}s`, '', `Total incidents: ${stats.total}`, `Warnings issued: ${stats.warnings}`, `Log-only events: ${stats.logs}`, '', 'Recent incidents:'];
 if (!recent.length) details.push('• None');
 else for (const incident of recent) details.push(`• ${incident.type} @ ${incident.group || '?'} (${incident.action || 'log'})`);
 await ctx.message.reply(statusText('Anti-Sticker Spam', s.enabled, details));
 },
};
