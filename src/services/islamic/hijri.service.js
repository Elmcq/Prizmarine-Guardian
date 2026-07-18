import { gregorianToHijri, formatHijri } from '../../utils/hijriCalculator.js';

export class HijriService {
  constructor({ logger }) {
    this.logger = logger;
  }

  getHijriDate() {
    try {
      return gregorianToHijri(new Date());
    } catch (err) {
      this.logger.warn('Hijri calculation failed', { error: err.message });
      return null;
    }
  }

  formatHijri(data) {
    return formatHijri(data);
  }
}

export default HijriService;
