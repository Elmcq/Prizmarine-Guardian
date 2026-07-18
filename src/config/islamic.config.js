export const ISLAMIC_CONFIG = Object.freeze({
  APIs: {
    myquran: {
      baseUrl: 'https://api.myquran.com/v2',
      timeout: 10_000,
    },
    aladhan: {
      baseUrl: 'https://api.aladhan.com/v1',
      timeout: 10_000,
    },
  },
  prayerNames: Object.freeze({
    Fajr: 'Fajr',
    Dhuhr: 'Dhuhr',
    Asr: 'Asr',
    Maghrib: 'Maghrib',
    Isha: 'Isha',
  }),
  prayerNamesID: Object.freeze({
    Fajr: 'Subuh',
    Dhuhr: 'Dzuhur',
    Asr: 'Ashar',
    Maghrib: 'Maghrib',
    Isha: 'Isya',
  }),
  reminderOffsets: Object.freeze({
    adzan: 0,
    iqomah: 10,
  }),
  defaultTimezone: 'Asia/Jakarta',
  defaultMethod: 20,
  maxRemindersPerGroup: 5,
  cacheTtlMs: 3_600_000,
});
