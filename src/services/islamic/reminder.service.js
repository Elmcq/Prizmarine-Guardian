import cron from 'node-cron';
import { ISLAMIC_CONFIG } from '../../config/islamic.config.js';
import { EVENTS } from '../../config/constants.js';

export class ReminderService {
  constructor({ repo, prayerService, client, logger, eventBus }) {
    this.repo = repo;
    this.prayerService = prayerService;
    this.client = client;
    this.logger = logger;
    this.eventBus = eventBus;
    this.jobs = new Map();
  }

  start() {
    this.cronJob = cron.schedule('* * * * *', () => {
      this.tick().catch((e) => this.logger.error('Reminder tick failed', { error: e.message }));
    });
    this.logger.info('Prayer reminder scheduler started');
  }

  stop() {
    if (this.cronJob) this.cronJob.stop();
    for (const [, job] of this.jobs) clearTimeout(job);
    this.jobs.clear();
    this.logger.info('Prayer reminder scheduler stopped');
  }

  async tick() {
    const groups = this.repo._data.groups || {};
    const now = new Date();

    for (const [groupId, settings] of Object.entries(groups)) {
      if (!settings.reminderEnabled) continue;
      if (!settings.cityId) continue;

      try {
        const times = await this.prayerService.getPrayerTimes(groupId);
        if (!times) continue;

        const nextPrayer = this.prayerService.getNextPrayer(times);
        if (!nextPrayer) continue;

        const diffMs = nextPrayer.date.getTime() - now.getTime();
        const diffMin = diffMs / 60_000;

        if (diffMin <= 0 && diffMin > -2) {
          await this._sendAdzanReminder(groupId, nextPrayer);
        } else if (diffMin > 0 && diffMin <= 10) {
          const offset = settings.reminderOffsets?.[nextPrayer.name] || 10;
          if (diffMin <= offset && diffMin > offset - 2) {
            await this._sendIqomahReminder(groupId, nextPrayer);
          }
        }
      } catch (err) {
        this.logger.error('Reminder check failed', { groupId, error: err.message });
      }
    }
  }

  async _sendAdzanReminder(groupId, prayer) {
    const names = ISLAMIC_CONFIG.prayerNamesID;
    const text = `🕌 *Waktunya Sholat ${names[prayer.name] || prayer.name}*\n\n⏰ ${prayer.time}\n\nSegera persiapkan diri untuk sholat.`;
    await this._send(groupId, text);
    this.eventBus.emit(EVENTS.PRAYER_REMINDER, { groupId, prayer: prayer.name, type: 'adzan' });
  }

  async _sendIqomahReminder(groupId, prayer) {
    const names = ISLAMIC_CONFIG.prayerNamesID;
    const text = `🕌 *Iqomah ${names[prayer.name] || prayer.name}*\n\n⏱️ Beberapa menit lagi...\n\nSegera menuju masjid/musholla.`;
    await this._send(groupId, text);
    this.eventBus.emit(EVENTS.PRAYER_REMINDER, { groupId, prayer: prayer.name, type: 'iqomah' });
  }

  async _send(groupId, text) {
    try {
      await this.client.sendMessage(groupId, text);
    } catch (err) {
      this.logger.error('Failed to send prayer reminder', { groupId, error: err.message });
    }
  }
}

export default ReminderService;
