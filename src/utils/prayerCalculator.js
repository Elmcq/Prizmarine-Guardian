/**
 * Local prayer time calculator based on PrayTimes.org algorithm.
 * No external API needed — pure astronomical calculation.
 */

const DEG = Math.PI / 180;

const METHODS = {
  ISNA: { fajrAngle: 15, ishaAngle: 15 },
  MWL: { fajrAngle: 18, ishaAngle: 17 },
  MEKKA: { fajrAngle: 18.5, ishaAngle: 90 },
  UMALQURA: { fajrAngle: 18.5, ishaAngle: 90 },
  KEMENAG: { fajrAngle: 20, ishaAngle: 18 },
};

function fixAngle(a) {
  a = a - 360 * Math.floor(a / 360);
  return a < 0 ? a + 360 : a;
}

function fixHour(h) {
  h = h - 24 * Math.floor(h / 24);
  return h < 0 ? h + 24 : h;
}

function toRad(deg) { return deg * DEG; }
function toDeg(rad) { return rad / DEG; }

function julianDate(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(toRad(g)) + 0.020 * Math.sin(toRad(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = toDeg(Math.atan2(Math.cos(toRad(e)) * Math.sin(toRad(L)), Math.cos(toRad(L)))) / 15;
  const d = toDeg(Math.asin(Math.sin(toRad(e)) * Math.sin(toRad(L))));
  const EqT = q / 15 - fixHour(RA);
  return { declination: d, equation: EqT };
}

function computeMidDay(jd, t) {
  const sun = sunPosition(jd + t);
  return fixHour(12 - sun.equation);
}

function computeAsr(step, lat, jd, t) {
  const sun = sunPosition(jd + t);
  const angle = toDeg(Math.atan(1 / (step + Math.tan(toRad(Math.abs(sun.declination))))));
  const cosH = (Math.sin(toRad(angle)) - Math.sin(toRad(sun.declination)) * Math.sin(toRad(lat))) /
               (Math.cos(toRad(sun.declination)) * Math.cos(toRad(lat)));
  if (cosH > 1 || cosH < -1) return NaN;
  const H = toDeg(Math.acos(cosH)) / 15;
  return fixHour(12 + H);
}

function getTimeOfAngle(angle, lat, jd, t, isRising) {
  const sun = sunPosition(jd + t);
  const cosH = (Math.sin(toRad(-angle)) - Math.sin(toRad(sun.declination)) * Math.sin(toRad(lat))) /
               (Math.cos(toRad(sun.declination)) * Math.cos(toRad(lat)));
  if (cosH > 1 || cosH < -1) return NaN;
  const H = toDeg(Math.acos(cosH)) / 15;
  return isRising ? fixHour(12 - H) : fixHour(12 + H);
}

function formatTime(time) {
  if (isNaN(time) || time == null) return null;
  time = fixHour(time + 0.5 / 60);
  const h = Math.floor(time);
  const m = Math.round((time - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function calculatePrayerTimes(lat, lng, date = new Date(), method = 'KEMENAG', timezoneOffset = null) {
  const m = METHODS[method] || METHODS.KEMENAG;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const tz = timezoneOffset != null ? timezoneOffset : -date.getTimezoneOffset() / 60;
  const jd = julianDate(year, month, day) - lng / (15 * 24);
  const t = tz / 24;

  const fajrAngle = m.fajrAngle;
  const ishaAngle = typeof m.ishaAngle === 'number' ? m.ishaAngle : 18;
  const asrStep = 1 + Math.abs(lat) / 90;

  const times = {
    Imsak: getTimeOfAngle(fajrAngle, lat, jd, t, true) - 10 / 60,
    Fajr: getTimeOfAngle(fajrAngle, lat, jd, t, true),
    Sunrise: getTimeOfAngle(0.833, lat, jd, t, true),
    Dhuhr: computeMidDay(jd, t),
    Asr: computeAsr(asrStep, lat, jd, t),
    Maghrib: getTimeOfAngle(0.833, lat, jd, t, false),
    Sunset: getTimeOfAngle(0.833, lat, jd, t, false),
    Isha: getTimeOfAngle(ishaAngle, lat, jd, t, false),
  };

  return {
    Fajr: formatTime(times.Fajr),
    Sunrise: formatTime(times.Sunrise),
    Dhuhr: formatTime(times.Dhuhr),
    Asr: formatTime(times.Asr),
    Maghrib: formatTime(times.Maghrib),
    Isha: formatTime(times.Isha),
    Imsak: formatTime(times.Imsak),
  };
}

export { METHODS };
