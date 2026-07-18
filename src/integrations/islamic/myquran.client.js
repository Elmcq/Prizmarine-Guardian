import { ISLAMIC_CONFIG } from '../../config/islamic.config.js';
import { logger } from '../../logger/winston.js';

const { baseUrl, timeout } = ISLAMIC_CONFIG.APIs.myquran;

export class MyQuranClient {
  async _fetch(path) {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`MyQuran API ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.status !== true) throw new Error(json.message || 'MyQuran API returned false');
      return json.data;
    } catch (err) {
      logger.warn('MyQuran API error', { path, error: err.message });
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async getLocations(query) {
    return this._fetch(`/sholat/kota/cari/${encodeURIComponent(query)}`);
  }

  async getPrayerTimes(cityId) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return this._fetch(`/sholat/jadwal/${cityId}/${yyyy}/${mm}/${dd}`);
  }

  async getHijriDate() {
    return this._fetch(`/cal/hijri`);
  }

  async getQiblaDirection(cityId) {
    return this._fetch(`/qibla/${cityId}`);
  }
}

export default new MyQuranClient();
