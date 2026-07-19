export const ISLAMIC_CONFIG = Object.freeze({
  prayerNames: Object.freeze({
    Fajr: 'Subuh',
    Sunrise: 'Terbit',
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
  defaultMethod: 'KEMENAG',
  maxRemindersPerGroup: 5,
  cacheTtlMs: 3_600_000,
});
