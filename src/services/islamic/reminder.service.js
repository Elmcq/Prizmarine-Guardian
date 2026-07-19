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
  }

  start() {
    this.cronJob = cron.schedule('* * * * *', () => {
      this.tick().catch((e) => this.logger.error('Reminder tick failed', { error: e.message }));
    });
    this.logger.info('Prayer reminder scheduler started');
  }

  stop() {
    if (this.cronJob) this.cronJob.stop();
    this.logger.info('Prayer reminder scheduler stopped');
  }

  async tick() {
    const groups = this.repo._data.groups || {};
    const now = new Date();

    for (const [groupId, settings] of Object.entries(groups)) {
      if (!settings.reminderEnabled && !settings.autoLock) continue;

      try {
        const times = this.prayerService.getPrayerTimes(groupId);
        if (!times) continue;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (settings.reminderEnabled) {
          await this._checkReminders(groupId, settings, times, currentMinutes);
        }

        if (settings.autoLock) {
          await this._checkAutoLock(groupId, settings, times, currentMinutes);
        }
      } catch (err) {
        this.logger.error('Reminder check failed', { groupId, error: err.message });
      }
    }
  }

  async _checkReminders(groupId, settings, times, currentMinutes) {
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const names = ISLAMIC_CONFIG.prayerNames;

    for (const prayer of prayers) {
      const timeStr = times[prayer];
      if (!timeStr) continue;
      const [h, m] = timeStr.split(':').map(Number);
      const prayerMinutes = h * 60 + m;

      const offset = settings.reminderOffsets?.[prayer] || 0;
      const adzanKey = `reminded_adzan_${prayer}_${groupId}`;
      const iqomahKey = `reminded_iqomah_${prayer}_${groupId}`;

      if (offset === 0 && currentMinutes === prayerMinutes && !this._sent(adzanKey)) {
        this._markSent(adzanKey);
        const text = `🕌 *Waktunya Sholat ${names[prayer]}*\n\n⏰ ${timeStr}\n\nSegera persiapkan diri untuk sholat.`;
        await this._send(groupId, text);
        this.eventBus.emit(EVENTS.PRAYER_REMINDER, { groupId, prayer, type: 'adzan' });
      }

      if (offset > 0) {
        const offsetKey = prayerMinutes - offset;
        if (currentMinutes === offsetKey && !this._sent(iqomahKey)) {
          this._markSent(iqomahKey);
          const text = `🕌 *Iqomah ${names[prayer]}*\n\n⏱️ ${offset} menit lagi...\n\nSegera menuju masjid/musholla.`;
          await this._send(groupId, text);
          this.eventBus.emit(EVENTS.PRAYER_REMINDER, { groupId, prayer, type: 'iqomah' });
        }
      }
    }
  }

  async _checkAutoLock(groupId, settings, times, currentMinutes) {
    const maghribStr = times.Maghrib;
    if (!maghribStr) return;

    const [h, m] = maghribStr.split(':').map(Number);
    const maghribMinutes = h * 60 + m;
    const lockBefore = settings.autoLockBefore || 5;
    const unlockAfter = settings.autoLockAfter || 15;

    const lockMinutes = maghribMinutes - lockBefore;
    const unlockMinutes = maghribMinutes + unlockAfter;

    const lockKey = `autolock_${groupId}`;
    const unlockKey = `autounlock_${groupId}`;

    if (currentMinutes === lockMinutes && !this._sent(lockKey)) {
      this._markSent(lockKey);
      await this._lockGroup(groupId);
      const text = `🕌 *Mode Sholat Maghrib*\n\nGroup di-*lock* ${lockBefore} menit sebelum Maghrib.\nAkan dibuka ${unlockAfter} menit setelah Maghrib.`;
      await this._send(groupId, text);
    }

    if (currentMinutes === unlockMinutes && !this._sent(unlockKey)) {
      this._markSent(unlockKey);
      await this._unlockGroup(groupId);
      const text = `🕌 *Selesai Sholat Maghrib*\n\nGroup telah di-*unlock*. Silakan chat kembali.`;
      await this._send(groupId, text);
    }
  }

  async _lockGroup(groupId) {
    try {
      await this.client.pupPage.evaluate(async (chatId) => {
        const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
        if (!chat || !chat.groupMetadata) return;
        await window.require('WAWebSetPropertyGroupAction').setGroupProperty(chat, 'announcement', 1);
      }, groupId);
    } catch (err) {
      this.logger.error('Auto-lock group failed', { groupId, error: err.message });
    }
  }

  async _unlockGroup(groupId) {
    try {
      await this.client.pupPage.evaluate(async (chatId) => {
        const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
        if (!chat || !chat.groupMetadata) return;
        await window.require('WAWebSetPropertyGroupAction').setGroupProperty(chat, 'announcement', 0);
      }, groupId);
    } catch (err) {
      this.logger.error('Auto-unlock group failed', { groupId, error: err.message });
    }
  }

  _sent(key) {
    if (!this._sentCache) this._sentCache = new Set();
    return this._sentCache.has(key);
  }

  _markSent(key) {
    if (!this._sentCache) this._sentCache = new Set();
    this._sentCache.add(key);
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
