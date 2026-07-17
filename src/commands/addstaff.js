import { errorText, usageText } from './messages.js';

export default {
 name: 'addstaff',
 description: 'Register a support staff member. Owner only.',
 adminOnly: true,
 usage: '<phone> <name>',
 async run(ctx) {
  const phone = (ctx.args[0] || '').replace(/[^0-9]/g, '');
  const name = ctx.args.slice(1).join(' ');

  if (!phone || phone.length < 6) {
   return ctx.message.reply(usageText(ctx.config.prefix, 'addstaff', '<phone> <name>'));
  }

  if (!name) {
   return ctx.message.reply(usageText(ctx.config.prefix, 'addstaff', '<phone> <name>'));
  }

  const existing = ctx.services.staff.repo.findByPhone(phone);
  if (existing) {
   return ctx.message.reply(errorText('Staff already registered.', `${existing.name} (${existing.phone}) is already in the staff list.`));
  }

  const record = await ctx.services.staff.add(phone, name, ctx.authorId);
  await ctx.message.reply(ctx.services.staff.formatStaffAdded(record));
 },
};
