import { rulesText } from './messages.js';

export default {
 name: 'rules',
 description: 'Show all community rules.',
 adminOnly: false,
 usage: '',
 async run(ctx) {
 const rules = ctx.services.rule.listRules();
 const lines = rules.length ? rules.map((rule) => `${rule.id} • ${rule.title}`) : ['No rules have been configured yet.'];
 await ctx.message.reply(rulesText(lines));
 },
};
