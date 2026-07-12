import { successText, errorText, usageText, OWNER_ONLY } from './messages.js';

export default {
 name: 'editrule',
 description: 'Edit a rule field: title, description or punishment (owner only).',
 adminOnly: true,
 usage: 'R8 <title|description|punishment> <value>',
 async run(ctx) {
 if (!ctx.services.permission.isOwner(ctx.authorId)) return ctx.message.reply(OWNER_ONLY);
 const [id, field, ...rest] = ctx.args;
 const value = rest.join(' ').trim();
 if (!id || !field || !value) return ctx.message.reply(usageText(ctx.config.prefix, 'editrule', 'R8 <title|description|punishment> <value>'));
 try {
 const res = await ctx.services.rule.editRule(id, field.toLowerCase(), value, ctx.authorId);
 if (res.unchanged) return ctx.message.reply(successText('Rule checked', 'No changes', `${res.id} ${res.field} is already "${res.new}".`));
 await ctx.message.reply(successText('Rule updated', 'Completed', `${res.id} ${res.field}: ${res.old} → ${res.new}`));
 } catch (err) {
 await ctx.message.reply(errorText(err.message, 'Provide a valid rule ID, field, and value.'));
 }
 },
};
