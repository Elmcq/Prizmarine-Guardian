/**
 * Local Hijri date calculator using the Tabular Islamic Calendar algorithm.
 * Based on the Kuwaiti algorithm / Tabular Islamic Calendar.
 * No external API needed.
 */

const HIJRI_MONTHS = [
  '', 'Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
  'Ramadhan', 'Syawal', 'Dzulqadah', 'Dzulhijjah',
];

const HIJRI_MONTHS_AR = [
  '', 'Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", "Dhul Hijjah",
];

/**
 * Days in each Hijri month (11 = leap year, 12 = normal year).
 */
function hijriMonthDays(year, month) {
  if (month % 2 === 1) return 30;
  if (month < 12) return 29;
  return this._isHijriLeapYear(year) ? 30 : 29;
}

function _isHijriLeapYear(year) {
  return ((11 * year + 14) % 30) < 11;
}

/**
 * Convert Gregorian date to Julian Day Number.
 */
function gregorianToJD(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/**
 * Convert Hijri date to Julian Day Number using the Tabular algorithm.
 * Uses the Kuwaiti algorithm constants.
 */
function hijriToJD(year, month, day) {
  return Math.floor(
    (11 * year + 3) / 30 +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 - 385
  );
}

/**
 * Convert Julian Day Number to Hijri date.
 * Uses the Kuwaiti algorithm (Tabular Islamic Calendar).
 */
function jdToHijri(jd) {
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
            Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
             Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { year, month, day };
}

/**
 * Convert a JavaScript Date to Hijri date.
 */
export function gregorianToHijri(date = new Date()) {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const hijri = jdToHijri(jd);

  return {
    day: hijri.day,
    month: hijri.month,
    monthName: HIJRI_MONTHS[hijri.month] || '',
    monthNameAr: HIJRI_MONTHS_AR[hijri.month] || '',
    year: hijri.year,
  };
}

/**
 * Format Hijri date as a readable string.
 */
export function formatHijri(data) {
  if (!data) return null;
  return `${data.day} ${data.monthName} ${data.year} H`;
}

export { HIJRI_MONTHS, HIJRI_MONTHS_AR };
