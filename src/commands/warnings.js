import { mentionToken } from '../utils/mentions.js';
import { panelText } from './messages.js';

export default {
 name: 'warnings',
 description: 'Show all stored warnings.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const records = ctx.repos.warnings.all();
 if (!records.length) return ctx.message.reply(panelText('Guardian Warnings', ['No warnings stored.'], '⚠️'));
 const lines = records.slice(0, 50).map((record) => {
 const group = record.groupId.split('@')[0].slice(-6);
 return `${mentionToken(record.userId)} • ${record.count} warning(s) • group …${group}`;
 });
 if (records.length > 50) lines.push(`Plus ${records.length - 50} more records.`);
 await ctx.message.reply(panelText(`Guardian Warnings (${records.length})`, lines, '⚠️'));
 },
};
