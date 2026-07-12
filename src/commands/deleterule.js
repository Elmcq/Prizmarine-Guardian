import { successText, errorText, usageText, OWNER_ONLY } from './messages.js';

export default {
 name: 'deleterule',
 description: 'Delete a community rule (owner only).',
 adminOnly: true,
 usage: 'RuleId',
 async run(ctx) {
 if (!ctx.services.permission.isOwner(ctx.authorId)) return ctx.message.reply(OWNER_ONLY);
 const id = (ctx.args[0] || '').trim();
 if (!id) return ctx.message.reply(usageText(ctx.config.prefix, 'deleterule', 'RuleId'));
 try {
 await ctx.services.rule.deleteRule(id, ctx.authorId);
 await ctx.message.reply(successText('Rule deleted', 'Completed', `Rule ${id} was removed.`));
 } catch (err) {
 await ctx.message.reply(errorText(err.message, 'Provide an existing rule ID.'));
 }
 },
};
