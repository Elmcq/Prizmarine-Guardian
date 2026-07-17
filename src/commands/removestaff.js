import { errorText, usageText } from './messages.js';

export default {
 name: 'removestaff',
 description: 'Remove a support staff member. Owner only.',
 adminOnly: true,
 usage: '<phone>',
 async run(ctx) {
  const phone = (ctx.args[0] || '').replace(/[^0-9]/g, '');

  if (!phone || phone.length < 6) {
   return ctx.message.reply(usageText(ctx.config.prefix, 'removestaff', '<phone>'));
  }

  const existing = ctx.services.staff.repo.findByPhone(phone);
  if (!existing) {
   return ctx.message.reply(errorText('Staff not found.', `No staff found with phone ${phone}.`));
  }

  await ctx.services.staff.remove(phone);
  await ctx.message.reply(ctx.services.staff.formatStaffRemoved(phone));
 },
};
