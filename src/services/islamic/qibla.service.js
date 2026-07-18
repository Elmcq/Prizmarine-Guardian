const COMPASS_DIRECTIONS = [
  { min: 348.75, max: 360, label: 'Utara (N)', emoji: '🫀' },
  { min: 0, max: 11.25, label: 'Utara (N)', emoji: '🫀' },
  { min: 11.25, max: 33.75, label: 'Timur Laut (NE)', emoji: '↗️' },
  { min: 33.75, max: 56.25, label: 'Timur (E)', emoji: '➡️' },
  { min: 56.25, max: 78.75, label: 'Tenggara (SE)', emoji: '↘️' },
  { min: 78.75, max: 101.25, label: 'Selatan (S)', emoji: '⬇️' },
  { min: 101.25, max: 123.75, label: 'Barat Daya (SW)', emoji: '↙️' },
  { min: 123.75, max: 146.25, label: 'Barat (W)', emoji: '⬅️' },
  { min: 146.25, max: 168.75, label: 'Barat Laut (NW)', emoji: '↖️' },
  { min: 168.75, max: 191.25, label: 'Utara (N)', emoji: '🫀' },
  { min: 191.25, max: 213.75, label: 'Timur Laut (NE)', emoji: '↗️' },
  { min: 213.75, max: 236.25, label: 'Timur (E)', emoji: '➡️' },
  { min: 236.25, max: 258.75, label: 'Tenggara (SE)', emoji: '↘️' },
  { min: 258.75, max: 281.25, label: 'Selatan (S)', emoji: '⬇️' },
  { min: 281.25, max: 303.75, label: 'Barat Daya (SW)', emoji: '↙️' },
  { min: 303.75, max: 326.25, label: 'Barat (W)', emoji: '⬅️' },
  { min: 326.25, max: 348.75, label: 'Barat Laut (NW)', emoji: '↖️' },
];

export class QiblaService {
  constructor({ logger }) {
    this.logger = logger;
  }

  getQiblaDirection(groupId, repo) {
    const group = repo.getGroup(groupId);
    if (!group?.lat || !group?.lng) return null;
    return this.getQiblaFromCoords(group.lat, group.lng);
  }

  getQiblaFromCoords(lat, lng) {
    const qiblaLat = 21.4225;
    const qiblaLng = 39.8262;
    const dLng = (qiblaLng - lng) * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lat2 = qiblaLat * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = ((bearing % 360) + 360) % 360;
    return { degree: bearing, direction: this._getCompassDirection(bearing) };
  }

  _getCompassDirection(degree) {
    for (const dir of COMPASS_DIRECTIONS) {
      if (degree >= dir.min && degree < dir.max) return dir;
    }
    return COMPASS_DIRECTIONS[0];
  }
}

export default QiblaService;
