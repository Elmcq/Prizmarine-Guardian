/**
 * !stats — show runtime statistics. Admin only.
 */

import { humanizeDuration } from '../utils/time.js';

export default {
  name: 'stats',
  description: 'Show bot statistics (uptime, memory, warnings, bans).',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const s = ctx.services.health.getStats();
    const ns = ctx.repos.nsfw?.getStats?.() || {
      detections: 0,
      warnings: 0,
      bans: 0,
      mostTriggeredCategory: null,
    };
    const ad = ctx.repos.advertisement?.getStats?.() || {
      detections: 0,
      warnings: 0,
      bans: 0,
      mostTriggeredCategory: null,
    };
    const raid = ctx.repos.raid?.getStats?.() || {
      total: 0,
      byType: {},
      activeRaidModes: 0,
    };
    const sticker = ctx.repos.sticker?.getStats?.() || {
      total: 0,
      byType: {},
      warnings: 0,
      logs: 0,
    };
    const rules = ctx.repos.rules?.getStats?.() || { total: 0, byPunishment: {} };
    const punishmentBreakdown = Object.entries(rules.byPunishment)
      .map(([p, c]) => `${p}: ${c}`)
      .join(', ');
    const lines = [
      `📊 *${ctx.config.botName} Stats*`,
      '',
      `Uptime: ${s.uptimeHuman}`,
      `Messages seen: ${s.messagesSeen}`,
      `Total warnings: ${s.totalWarnings}`,
      `Active bans: ${s.activeBans}`,
      `Memory (RSS): ${s.memory.rssMb} MB`,
      `Heap used: ${s.memory.heapUsedMb} MB`,
      '',
      `🔞 NSFW Detections: ${ns.detections}`,
      `🔞 NSFW Warnings: ${ns.warnings}`,
      `🔞 NSFW Bans: ${ns.bans}`,
      `🔞 Most Triggered: ${ns.mostTriggeredCategory || 'none'}`,
      '',
      `📢 AD Detections: ${ad.detections}`,
      `📢 AD Warnings: ${ad.warnings}`,
      `📢 AD Bans: ${ad.bans}`,
      `📢 Most Triggered: ${ad.mostTriggeredCategory || 'none'}`,
      '',
      `🚨 Raid Incidents: ${raid.total}`,
      `🚨 Active Raid Modes: ${raid.activeRaidModes}`,
      '',
      `💠 Sticker Incidents: ${sticker.total}`,
      `💠 Sticker Warnings: ${sticker.warnings}`,
      `💠 Sticker Log-only: ${sticker.logs}`,
      '',
      `📜 Total Rules: ${rules.total}`,
      `📜 By Punishment: ${punishmentBreakdown || 'none'}`,
    ];
    await ctx.message.reply(lines.join('\n'));
  },
};
