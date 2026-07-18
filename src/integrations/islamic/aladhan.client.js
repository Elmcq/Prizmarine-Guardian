import { ISLAMIC_CONFIG } from '../../config/islamic.config.js';
import { logger } from '../../logger/winston.js';

const { baseUrl, timeout } = ISLAMIC_CONFIG.APIs.aladhan;

export class AladhanClient {
  async _fetch(path) {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Aladhan API ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.code !== 200) throw new Error(json.message || 'Aladhan API error');
      return json.data;
    } catch (err) {
      logger.warn('Aladhan API error', { path, error: err.message });
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async getPrayerTimes(lat, lng, date) {
    const d = date || new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return this._fetch(`/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${ISLAMIC_CONFIG.defaultMethod}`);
  }

  async getHijriDate(lat, lng, date) {
    const d = date || new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return this._fetch(`/gToH/${dd}-${mm}-${yyyy}`);
  }

  async getQiblaDirection(lat, lng) {
    return this._fetch(`/qibla/${lat}/${lng}`);
  }
}

export default new AladhanClient();
