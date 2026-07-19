import { successText, errorText, panelText, GROUP_ONLY } from '../../../commands/messages.js';

export default {
  name: 'fitness',
  description: 'Pengaturan fitness reminder (workout & meal).',
  adminOnly: false,
  usage: '[reminder on|off] | [workout <HH:MM>] | [meal <HH:MM>] | [status]',
  async run(ctx) {
    const args = ctx.args || [];
    const sub = args[0]?.toLowerCase();

    if (!ctx.services.fitness) {
      return ctx.message.reply(errorText('Fitness module not loaded.'));
    }
    const repo = ctx.repos.fitness;
    const userId = ctx.authorId;

    if (sub === 'reminder') {
      const action = args[1]?.toLowerCase();
      if (action === 'on') {
        const existing = repo.getUserReminders(userId);
        if (existing.length === 0) {
          await repo.addReminder(userId, 'workout', '17:00', 7);
          await repo.addReminder(userId, 'meal', '12:00', 7);
        } else {
          for (const r of existing) {
            if (!r.enabled) await repo.toggleReminder(userId, r.type, true);
          }
        }
        return ctx.message.reply(successText('Fitness Reminder Aktif', 'Completed', 'Reminder workout dan meal akan dikirim.'));
      }
      if (action === 'off') {
        const existing = repo.getUserReminders(userId);
        for (const r of existing) {
          await repo.toggleReminder(userId, r.type, false);
        }
        return ctx.message.reply(successText('Fitness Reminder Nonaktif', 'Completed', 'Semua fitness reminder dimatikan.'));
      }
      return ctx.message.reply(errorText('Pilih on atau off.', `Gunakan: ${ctx.config.prefix}fitness reminder on/off`));
    }

    if (sub === 'workout') {
      const time = args[1];
      if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
        return ctx.message.reply(errorText('Format waktu salah.', `Gunakan: ${ctx.config.prefix}fitness workout 17:00`));
      }
      const existing = repo.getUserReminders(userId).find((r) => r.type === 'workout');
      if (existing) {
        await repo.setTime(userId, 'workout', time);
        if (!existing.enabled) await repo.toggleReminder(userId, 'workout', true);
      } else {
        await repo.addReminder(userId, 'workout', time, 7);
      }
      return ctx.message.reply(successText('Workout Reminder Diatur', 'Completed', `Workout reminder: ${time} WIB`));
    }

    if (sub === 'meal') {
      const time = args[1];
      if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
        return ctx.message.reply(errorText('Format waktu salah.', `Gunakan: ${ctx.config.prefix}fitness meal 12:00`));
      }
      const existing = repo.getUserReminders(userId).find((r) => r.type === 'meal');
      if (existing) {
        await repo.setTime(userId, 'meal', time);
        if (!existing.enabled) await repo.toggleReminder(userId, 'meal', true);
      } else {
        await repo.addReminder(userId, 'meal', time, 7);
      }
      return ctx.message.reply(successText('Meal Reminder Diatur', 'Completed', `Meal reminder: ${time} WIB`));
    }

    const reminders = repo.getUserReminders(userId);
    const workoutR = reminders.find((r) => r.type === 'workout');
    const mealR = reminders.find((r) => r.type === 'meal');
    const lines = [
      `🏋️ Workout: ${workoutR ? (workoutR.enabled ? `🟢 ${workoutR.time}` : `🔴 Off (${workoutR.time})`) : 'Belum diatur'}`,
      `🍽️ Meal: ${mealR ? (mealR.enabled ? `🟢 ${mealR.time}` : `🔴 Off (${mealR.time})`) : 'Belum diatur'}`,
      '',
      'Sub-commands:',
      `   ${ctx.config.prefix}fitness reminder on/off`,
      `   ${ctx.config.prefix}fitness workout <HH:MM>`,
      `   ${ctx.config.prefix}fitness meal <HH:MM>`,
    ];
    await ctx.message.reply(panelText('Fitness Settings', lines, '🏋️'));
  },
};
