import { rulesText, errorText, usageText } from './messages.js';

export default {
 name: 'rule',
 description: 'Show the full detail of one rule (e.g. !rule R2).',
 adminOnly: true,
 usage: 'RuleId',
 async run(ctx) {
 const id = (ctx.args[0] || '').trim();
 if (!id) return ctx.message.reply(usageText(ctx.config.prefix, 'rule', 'RuleId'));
 const rule = ctx.services.rule.getRule(id);
 if (!rule) return ctx.message.reply(errorText(`Rule "${id}" was not found.`, 'Provide an existing rule ID.'));
 await ctx.message.reply(rulesText([`Rule: ${rule.id}`, `Title: ${rule.title}`, `Description: ${rule.description}`, `Punishment: ${rule.punishment}`]));
 },
};
