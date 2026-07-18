import { calculatePrayerTimes } from '../../utils/prayerCalculator.js';
import { findCity, INDONESIAN_CITIES } from '../../utils/cities.js';
import { ISLAMIC_CONFIG } from '../../config/islamic.config.js';

export class PrayerService {
  constructor({ repo, logger }) {
    this.repo = repo;
    this.logger = logger;
  }

  searchCity(query) {
    const city = findCity(query);
    if (!city) return null;
    return [city];
  }

  getPrayerTimes(groupId) {
    const group = this.repo.getGroup(groupId);
    if (!group) return null;

    if (group.lat && group.lng) {
      const tz = group.timezone ? parseInt(group.timezone) : 7;
      return calculatePrayerTimes(group.lat, group.lng, new Date(), 'KEMENAG', tz);
    }

    if (group.cityId) {
      const city = this._findCityById(group.cityId);
      if (city) {
        return calculatePrayerTimes(city.lat, city.lng, new Date(), 'KEMENAG', city.tz);
      }
    }

    return null;
  }

  getPrayerTimesByCoords(lat, lng, tz = 7) {
    return calculatePrayerTimes(lat, lng, new Date(), 'KEMENAG', tz);
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
      Fajr: `${names.Fajr}: ${times.Fajr}`,
      Dhuhr: `${names.Dhuhr}: ${times.Dhuhr}`,
      Asr: `${names.Asr}: ${times.Asr}`,
      Maghrib: `${names.Maghrib}: ${times.Maghrib}`,
      Isha: `${names.Isha}: ${times.Isha}`,
      Sunrise: times.Sunrise ? `Terbit: ${times.Sunrise}` : '',
    };
  }

  _findCityById(id) {
    for (const city of Object.values(INDONESIAN_CITIES)) {
      if (city.id === id) return city;
    }
    return null;
  }
}

export default PrayerService;
