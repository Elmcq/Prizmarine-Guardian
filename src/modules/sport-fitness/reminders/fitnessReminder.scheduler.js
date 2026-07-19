import cron from 'node-cron';

export class FitnessReminderScheduler {
  constructor({ repo, client, logger }) {
    this.repo = repo;
    this.client = client;
    this.logger = logger;
  }

  start() {
    this.cronJob = cron.schedule('* * * * *', () => {
      this.tick().catch((e) => this.logger.error('Fitness reminder tick failed', { error: e.message }));
    });
    this.logger.info('Fitness reminder scheduler started');
  }

  stop() {
    if (this.cronJob) this.cronJob.stop();
    this.logger.info('Fitness reminder scheduler stopped');
  }

  async tick() {
    const now = new Date();
    const nowUTC = now.getTime() + now.getTimezoneOffset() * 60000;
    const active = this.repo.getActiveReminders();
    const sent = new Set();

    for (const reminder of active) {
      const tz = reminder.timezone || 7;
      const nowLocal = new Date(nowUTC + tz * 3600000);
      const [rh, rm] = reminder.time.split(':').map(Number);

      if (nowLocal.getHours() === rh && nowLocal.getMinutes() === rm) {
        const key = `${reminder.userId}_${reminder.type}_${nowLocal.toDateString()}`;
        if (sent.has(key)) continue;
        sent.add(key);
        await this._send(reminder);
      }
    }
  }

  async _send(reminder) {
    try {
      const isWorkout = reminder.type === 'workout';
      const text = isWorkout
        ? [
          '🏋️ *Fitness Reminder*',
          '',
          `<@${reminder.userId}>`,
          '',
          'Waktunya workout!',
          '',
          '🔥 Warm up dulu',
          '💧 Minum air yang cukup',
          '🍽️ Makan yang proper setelah latihan',
        ].join('\n')
        : [
          '🍽️ *Meal Reminder*',
          '',
          `<@${reminder.userId}>`,
          '',
          'Waktunya makan!',
          '',
          'Jaga nutrisi dan energi untuk aktivitas.',
        ].join('\n');

      await this.client.sendMessage(reminder.userId, text);
    } catch (err) {
      this.logger.error('Failed to send fitness reminder', { userId: reminder.userId, error: err.message });
    }
  }
}

export default FitnessReminderScheduler;
