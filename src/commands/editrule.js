import { successText, errorText, usageText, OWNER_ONLY } from './messages.js';

export default {
 name: 'editrule',
 description: 'Edit rule title, description, punishment, severity, cooldown or enabled state.',
 adminOnly: true,
 usage: 'R8 <title|description|punishment|severity|cooldown|enabled> <value>',
 async run(ctx) {
 if (!ctx.services.permission.isOwner(ctx.authorId)) return ctx.message.reply(OWNER_ONLY);
 const [id, field, ...rest] = ctx.args;
 const value = rest.join(' ').trim();
 if (!id || !field || !value) {
 return ctx.message.reply(usageText(ctx.config.prefix, 'editrule', 'R8 <title|description|punishment|severity|cooldown|enabled> <value>'));
 }
 try {
 const result = await ctx.services.rule.editRule(id, field.toLowerCase(), value, ctx.authorId);
 if (result.unchanged) return ctx.message.reply(successText('Rule checked', 'No changes', `${result.id} ${result.field} is already "${result.new}".`));
 await ctx.message.reply(successText('Rule updated', 'Completed', `${result.id} ${result.field}: ${result.old} → ${result.new}`));
 } catch (err) {
 await ctx.message.reply(errorText(err.message, 'Provide a valid rule ID, field, and value.'));
 }
 },
};
