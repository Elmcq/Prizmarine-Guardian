import { statusText, successText, usageText } from './messages.js';

export default {
 name: 'antitoxic',
 description: 'Show, enable, or disable AntiToxic.',
 adminOnly: true,
 usage: 'status|on|off',
 async run(ctx) {
 const action = (ctx.args[0] || 'status').toLowerCase();
 if (!['status', 'on', 'off'].includes(action)) {
 return ctx.message.reply(usageText(ctx.config.prefix, 'antitoxic', 'status|on|off'));
 }
if (action === 'status') {
 const settings = ctx.repos.badwords.getSettings();
 const stats = ctx.repos.badwords.getStats();
 const contextualConfig = settings.contextualConfig || {};
 return ctx.message.reply(statusText('AntiToxic', settings.enabled, [
 `Detections: ${stats.detections}`,
 `Keywords: ${settings.keywords}`,
 `Patterns: ${settings.patterns}`,
 `Warn limit: ${settings.warnLimit}`,
 `Toxic threshold: ${contextualConfig.toxicThreshold || 3}`,
 `Cooldown: ${(contextualConfig.cooldownDurationMs || 15000) / 1000}s`,
 `Negation window: ${contextualConfig.negationWindow || 3} words`,
 `Target required: ${contextualConfig.targetRequired ? 'Yes' : 'No'}`,
 `Top category: ${stats.mostTriggeredCategory || 'None'}`,
 ]));
}
 const enabled = action === 'on';
 await ctx.repos.badwords.setEnabled(enabled);
 if (enabled) {
 await ctx.repos.badwords.reload();
 ctx.services.toxicity.reload();
 }
 const settings = ctx.repos.badwords.getSettings();
 ctx.logger.info('AntiToxic state changed', {
 enabled,
 keywords: settings.keywords,
 patterns: settings.patterns,
 moderator: ctx.authorId,
 });
 await ctx.message.reply(successText(
 `AntiToxic ${enabled ? 'enabled' : 'disabled'}`,
 'Completed',
 enabled
 ? `${settings.keywords} keywords and ${settings.patterns} patterns loaded. Incoming group messages will be scanned.`
 : 'Incoming messages will not be scanned.',
 ));
 },
};
