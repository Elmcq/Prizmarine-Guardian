/**
 * Local prayer time calculator based on PrayTimes.org algorithm.
 * No external API needed — pure astronomical calculation.
 */

const DEG = Math.PI / 180;
const MIDNIGHT_STR = '00:00';

const METHODS = {
  ISNA: { fajrAngle: 15, ishaAngle: 15 },
  MWL: { fajrAngle: 18, ishaAngle: 17 },
  MEKKA: { fajrAngle: 18.5, ishaAngle: '90 min' },
  UMALQURA: { fajrAngle: 18.5, ishaAngle: '90 min' },
  KEMENAG: { fajrAngle: 20, ishaAngle: 18 },
};

function radToDeg(rad) { return rad / DEG; }
function degToRad(deg) { return deg * DEG; }
function dms(deg) {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = Math.round(((deg - d) * 60 - m) * 60);
  return [d, m, s];
}

function fixAngle(a) {
  a = a - 360 * Math.floor(a / 360);
  return a < 0 ? a + 360 : a;
}

function fixHour(h) {
  h = h - 24 * Math.floor(h / 24);
  return h < 0 ? h + 24 : h;
}

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
  const L = fixAngle(q + 1.915 * Math.sin(degToRad(g)) + 0.020 * Math.sin(degToRad(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = radToDeg(Math.atan2(Math.cos(degToRad(e)) * Math.sin(degToRad(L)), Math.cos(degToRad(L)))) / 15;
  const d = radToDeg(Math.asin(Math.sin(degToRad(e)) * Math.sin(degToRad(L))));
  const EqT = q / 15 - fixHour(RA);
  return { declination: d, equation: EqT };
}

function computeMidDay(jd, t) {
  const sun = sunPosition(jd + t);
  const D = 12 - sun.equation;
  return fixHour(D);
}

function computeAsr(step, j, t) {
  const sun = sunPosition(j + t);
  const G = -radToDeg(Math.atan(1 / (step + Math.tan(Math.abs(degToRad(sun.declination))))));
  return computeMidDay(j, G);
}

function hourAngle(angle, jd, t, isRising) {
  const sun = sunPosition(jd + t);
  const H = radToDeg(Math.acos((-Math.sin(degToRad(angle)) - Math.sin(degToRad(sun.declination)) * Math.sin(degToRad(t))) / (Math.cos(degToRad(sun.declination)) * Math.cos(degToRad(t)))));
  return isRising ? 12 - H / 15 : 12 + H / 15;
}

function tuneTimes(times, offsets) {
  const keys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (let i = 0; i < keys.length; i++) {
    if (offsets[i] != null) {
      times[keys[i]] = (times[keys[i]] || 0) + offsets[i] / 60;
    }
  }
  return times;
}

function getTimeOfDegree(angle, jd, t, isRising) {
  const sun = sunPosition(jd + t);
  const cosH = (-Math.sin(degToRad(angle)) - Math.sin(degToRad(sun.declination)) * Math.sin(degToRad(t))) / (Math.cos(degToRad(sun.declination)) * Math.cos(degToRad(t)));
  if (cosH > 1 || cosH < -1) return NaN;
  const H = radToDeg(Math.acos(cosH)) / 15;
  return isRising ? 12 - H : 12 + H;
}

function formatTime(time) {
  if (isNaN(time) || time == null) return null;
  time = fixHour(time + 0.5 / 60);
  const [h, m, s] = dms(time * 15);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function calculatePrayerTimes(lat, lng, date = new Date(), method = 'KEMENAG', timezoneOffset = null) {
  const m = METHODS[method] || METHODS.KEMENAG;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const jd = julianDate(year, month, day) - lng / (15 * 24);
  const tz = timezoneOffset != null ? timezoneOffset : -date.getTimezoneOffset() / 60;

  const times = {
    Imsak: NaN,
    Fajr: NaN,
    Sunrise: NaN,
    Dhuhr: NaN,
    Asr: NaN,
    Maghrib: NaN,
    Sunset: NaN,
    Isha: NaN,
  };

  const t = tz / 24;
  times.Dhuhr = computeMidDay(jd, t);
  times.Asr = computeAsr(1 + Math.abs(lat) / 90, jd, t);

  const fajrAngle = m.fajrAngle;
  const ishaAngle = typeof m.ishaAngle === 'number' ? m.ishaAngle : 18;

  times.Fajr = getTimeOfDegree(fajrAngle, jd, t, true);
  times.Sunrise = getTimeOfDegree(0.833, jd, t, true);
  times.Maghrib = getTimeOfDegree(0.833, jd, t, false);
  times.Isha = getTimeOfDegree(ishaAngle, jd, t, false);

  if (method === 'UMALQURA' || method === 'MEKKA') {
    times.Isha = times.Maghrib + 90 / 60;
  }

  times.Imsak = times.Fajr - 10 / 60;

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
