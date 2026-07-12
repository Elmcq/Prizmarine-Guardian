import { successText, errorText, usageText, OWNER_ONLY } from './messages.js';

export default {
 name: 'addrule',
 description: 'Add a new community rule (owner only).',
 adminOnly: true,
 usage: 'R8 | Rule Title | Rule Description | Punishment',
 async run(ctx) {
 if (!ctx.services.permission.isOwner(ctx.authorId)) return ctx.message.reply(OWNER_ONLY);
 const raw = (ctx.args || []).join(' ').trim();
 if (!raw) return ctx.message.reply(usageText(ctx.config.prefix, 'addrule', 'R8 | Rule Title | Rule Description | Punishment'));
 const parts = raw.split(/\s*\|\s*/).map((s) => s.trim());
 const [id, title, description] = parts;
 const punishment = (parts[3] || 'Warn').trim();
 try {
 const rule = await ctx.services.rule.addRule({ id, title, description, punishment }, ctx.authorId);
 await ctx.message.reply(successText('Rule added', 'Completed', `${rule.id} • ${rule.title} • ${rule.punishment}`));
 } catch (err) {
 await ctx.message.reply(errorText(err.message, 'Provide a unique rule ID and valid rule details.'));
 }
 },
};
