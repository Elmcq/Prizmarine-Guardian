import { humanizeDuration } from '../utils/time.js';
import { panelText } from './messages.js';

export default {
 name: 'uptime',
 description: 'Show bot uptime.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const uptimeMs = Date.now() - ctx.services.health.startTime;
 await ctx.message.reply(panelText('Guardian Uptime', [`Status: Online`, `Uptime: ${humanizeDuration(uptimeMs)}`], '📊'));
 },
};
