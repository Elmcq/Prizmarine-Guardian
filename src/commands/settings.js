import { humanizeDuration } from '../utils/time.js';
import { panelText } from './messages.js';

export default {
 name: 'settings',
 description: 'Show the current configuration.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const c = ctx.config;
 await ctx.message.reply(panelText('Guardian Settings', [`Bot: ${c.botName}`, `Prefix: ${c.prefix}`, `Owner: ${c.owner}`, `Warning limit: ${c.warnLimit}`, `Ban duration: ${humanizeDuration(c.banDuration)}`, `Anti-spam: ${c.spamCount} messages / ${humanizeDuration(c.spamWindow)}`, `Anti-flood: ${c.floodCount} identical messages`, `Log level: ${c.logLevel}`], '🛡️'));
 },
};
