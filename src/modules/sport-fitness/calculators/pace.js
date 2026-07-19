export function calculatePace(distanceKm, durationMin) {
  if (!distanceKm || !durationMin || distanceKm <= 0 || durationMin <= 0) return null;
  const paceMin = durationMin / distanceKm;
  const min = Math.floor(paceMin);
  const sec = Math.round((paceMin - min) * 60);
  return {
    distance: `${distanceKm} km`,
    duration: `${durationMin} menit`,
    pace: `${min}:${String(sec).padStart(2, '0')} min/km`,
    paceRaw: paceMin,
  };
}
