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
 return ctx.message.reply(statusText('AntiToxic', settings.enabled, [
 `Detections: ${stats.detections}`,
 `Keywords: ${settings.keywords}`,
 `Top category: ${stats.mostTriggeredCategory || 'None'}`,
 ]));
 }
 const enabled = action === 'on';
 await ctx.repos.badwords.setEnabled(enabled);
 await ctx.message.reply(successText(
 `AntiToxic ${enabled ? 'enabled' : 'disabled'}`,
 'Completed',
 `Incoming messages ${enabled ? 'will be scanned' : 'will not be scanned'}.`,
 ));
 },
};
