export function calculateIdealWeight(heightCm) {
  const heightM = heightCm / 100;
  const min = Math.round((18.5 * heightM * heightM) * 10) / 10;
  const max = Math.round((24.9 * heightM * heightM) * 10) / 10;
  const mid = Math.round(((min + max) / 2) * 10) / 10;
  return { min, max, mid, range: `${min} - ${max} kg` };
}
