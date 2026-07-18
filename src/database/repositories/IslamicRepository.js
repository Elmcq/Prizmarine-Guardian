export class IslamicRepository {
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.islamic;
  }

  get _data() {
    return this.db.data;
  }

  async _persist() {
    await this.dbService.persist(this.db);
  }

  getGroup(groupId) {
    return this._data.groups?.[groupId] || null;
  }

  async saveGroup(groupId, settings) {
    if (!this._data.groups) this._data.groups = {};
    this._data.groups[groupId] = {
      ...(this._data.groups[groupId] || {}),
      ...settings,
    };
    await this._persist();
  }

  async removeGroup(groupId) {
    if (this._data.groups) {
      delete this._data.groups[groupId];
      await this._persist();
    }
  }

  async setReminderEnabled(groupId, enabled) {
    const group = this.getGroup(groupId) || {};
    group.reminderEnabled = enabled;
    await this.saveGroup(groupId, group);
  }

  async setPrayerMode(groupId, enabled) {
    const group = this.getGroup(groupId) || {};
    group.prayerMode = enabled;
    await this.saveGroup(groupId, group);
  }

  async setTimezone(groupId, timezone) {
    const group = this.getGroup(groupId) || {};
    group.timezone = timezone;
    await this.saveGroup(groupId, group);
  }

  async setCity(groupId, cityId, cityName) {
    const group = this.getGroup(groupId) || {};
    group.cityId = cityId;
    group.cityName = cityName;
    await this.saveGroup(groupId, group);
  }

  async setCoordinates(groupId, lat, lng) {
    const group = this.getGroup(groupId) || {};
    group.lat = lat;
    group.lng = lng;
    await this.saveGroup(groupId, group);
  }

  async setReminderOffset(groupId, prayer, minutes) {
    const group = this.getGroup(groupId) || {};
    if (!group.reminderOffsets) group.reminderOffsets = {};
    group.reminderOffsets[prayer] = minutes;
    await this.saveGroup(groupId, group);
  }

  getCachedPrayerTimes(cityId) {
    const cached = this._data.prayerCache?.[cityId];
    if (!cached) return null;
    if (Date.now() - cached.timestamp > 3_600_000) return null;
    return cached.times;
  }

  async cachePrayerTimes(cityId, times) {
    if (!this._data.prayerCache) this._data.prayerCache = {};
    this._data.prayerCache[cityId] = { times, timestamp: Date.now() };
    await this._persist();
  }
}

export default IslamicRepository;
