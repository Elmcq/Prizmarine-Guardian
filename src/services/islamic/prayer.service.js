import myquran from '../../integrations/islamic/myquran.client.js';
import aladhan from '../../integrations/islamic/aladhan.client.js';
import { ISLAMIC_CONFIG } from '../../config/islamic.config.js';

export class PrayerService {
  constructor({ repo, logger }) {
    this.repo = repo;
    this.logger = logger;
  }

  async searchCity(query) {
    try {
      return await myquran.getLocations(query);
    } catch {
      return [];
    }
  }

  async getPrayerTimes(groupId) {
    const group = this.repo.getGroup(groupId);
    if (!group?.cityId) return null;

    const cached = this.repo.getCachedPrayerTimes(group.cityId);
    if (cached) return cached;

    try {
      const data = await myquran.getPrayerTimes(group.cityId);
      const times = data.jadwal?.[0];
      if (times) {
        await this.repo.cachePrayerTimes(group.cityId, times);
      }
      return times || null;
    } catch (err) {
      this.logger.warn('Failed to fetch prayer times', { groupId, error: err.message });
      return null;
    }
  }

  async getPrayerTimesByCoords(lat, lng) {
    try {
      const data = await aladhan.getPrayerTimes(lat, lng);
      return data.timings || null;
    } catch (err) {
      this.logger.warn('Failed to fetch prayer times by coords', { error: err.message });
      return null;
    }
  }

  getNextPrayer(times) {
    if (!times) return null;
    const now = new Date();
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    for (const name of prayers) {
      const timeStr = times[name];
      if (!timeStr) continue;
      const [h, m] = timeStr.split(':').map(Number);
      const prayerDate = new Date(now);
      prayerDate.setHours(h, m, 0, 0);
      if (prayerDate > now) {
        return { name, time: timeStr, date: prayerDate };
      }
    }
    return { name: 'Fajr', time: times.Fajr, date: this._tomorrowFajr(times.Fajr) };
  }

  _tomorrowFajr(fajrTime) {
    const [h, m] = fajrTime.split(':').map(Number);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return d;
  }

  formatPrayerTimes(times) {
    if (!times) return null;
    const names = ISLAMIC_CONFIG.prayerNamesID;
    return {
      date: times.date,
      hijri: times.hijri,
      Fajr: `${names.Fajr}: ${times.Fajr}`,
      Dhuhr: `${names.Dhuhr}: ${times.Dhuhr}`,
      Asr: `${names.Asr}: ${times.Asr}`,
      Maghrib: `${names.Maghrib}: ${times.Maghrib}`,
      Isha: `${names.Isha}: ${times.Isha}`,
    };
  }
}

export default PrayerService;
