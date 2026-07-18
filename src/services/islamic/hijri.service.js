import myquran from '../../integrations/islamic/myquran.client.js';
import aladhan from '../../integrations/islamic/aladhan.client.js';

const HIJRI_MONTHS = [
  '', 'Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Sya\'ban',
  'Ramadhan', 'Syawal', 'Dulqa\'dah', 'Dulhijjah',
];

const HIJRI_MONTHS_ID = [
  '', 'Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
  'Ramadhan', 'Syawal', 'Dzulqadah', 'Dzulhijjah',
];

export class HijriService {
  constructor({ logger }) {
    this.logger = logger;
  }

  async getHijriDate(groupId, repo) {
    try {
      const data = await myquran.getHijriDate();
      if (data?.hijri) {
        return {
          day: data.hijri.day,
          month: data.hijri.month?.number,
          monthName: data.hijri.month?.en,
          monthNameID: HIJRI_MONTHS_ID[data.hijri.month?.number] || data.hijri.month?.en,
          year: data.hijri.year,
          dayOfWeek: data.hijri.weekday?.en,
          dayOfWeekID: data.hijri.weekday?.ar,
        };
      }
    } catch (err) {
      this.logger.debug('MyQuran hijri failed, trying Aladhan', { error: err.message });
    }

    try {
      const data = await aladhan.getHijriDate();
      if (data?.hijri) {
        const m = data.hijri.month?.number;
        return {
          day: data.hijri.day,
          month: m,
          monthName: HIJRI_MONTHS[m],
          monthNameID: HIJRI_MONTHS_ID[m],
          year: data.hijri.year,
          dayOfWeek: data.hijri.weekday?.en,
          dayOfWeekID: data.hijri.weekday?.ar,
        };
      }
    } catch (err) {
      this.logger.warn('Aladhan hijri also failed', { error: err.message });
    }

    return this._fallbackHijri();
  }

  _fallbackHijri() {
    const now = new Date();
    const approx = Math.floor((now.getTime() / 86400000 - 2440587) * 10631 / 362510);
    const y = approx + 1;
    const m = ((approx - Math.floor((y - 1) * 325 / 30)) % 12) + 1;
    const d = now.getDate();
    return {
      day: d,
      month: m,
      monthName: HIJRI_MONTHS[m],
      monthNameID: HIJRI_MONTHS_ID[m],
      year: y,
      dayOfWeek: '',
      dayOfWeekID: '',
    };
  }

  formatHijri(data) {
    if (!data) return null;
    return `${data.day} ${data.monthNameID} ${data.year} H`;
  }
}

export default HijriService;
