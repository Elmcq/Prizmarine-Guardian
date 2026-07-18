/**
 * Local Hijri (Um Al-Qura) date calculator.
 * No external API needed.
 */

const HIJRI_MONTHS = [
  '', 'Muharram', 'Shafar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Syaban",
  'Ramadhan', 'Syawal', 'Dzulqadah', 'Dzulhijjah',
];

const HIJRI_MONTHS_AR = [
  '', 'Muharram', 'Shafar', 'Rabi\u02BBul Awal', 'Rabi\u02BBul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", "Dhul Hijjah",
];

function gregorianToJulian(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function julianToGregorian(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let A;
  if (z < 2299161) {
    A = z;
  } else {
    const a = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + a - Math.floor(a / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + f;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day: Math.floor(day) };
}

function yearStart(year) {
  const jd = Math.floor((11 * year + 3) / 30) + 354 * (year - 1) + 1948440 - 385;
  return jd;
}

function monthStart(hijriYear, hijriMonth) {
  return Math.ceil(29.5001 * (hijriMonth - 1)) + yearStart(hijriYear);
}

export function gregorianToHijri(date = new Date()) {
  const jd = gregorianToJulian(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const y = Math.floor(((jd - 1948440) + 10632) / 10631);
  const m = Math.min(12, Math.ceil(((jd - 1948440) + 10631) / 325.3));
  const d = jd - yearStart(Math.floor(y)) - monthStart(Math.floor(y), Math.ceil(m)) + 1;

  const year = Math.floor(y);
  const month = Math.ceil(m);
  const day = Math.floor(d);

  return {
    day,
    month,
    monthName: HIJRI_MONTHS[month] || '',
    monthNameAr: HIJRI_MONTHS_AR[month] || '',
    year,
  };
}

export function formatHijri(data) {
  if (!data) return null;
  return `${data.day} ${data.monthName} ${data.year} H`;
}

export { HIJRI_MONTHS, HIJRI_MONTHS_AR };
