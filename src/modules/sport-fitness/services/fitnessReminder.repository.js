export class FitnessReminderRepository {
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.fitness;
  }

  get _data() {
    return this.db.data;
  }

  async _persist() {
    await this.dbService.persist(this.db);
  }

  getUserReminders(userId) {
    return (this._data.reminders || []).filter((r) => r.userId === userId);
  }

  getAllReminders() {
    return this._data.reminders || [];
  }

  getActiveReminders() {
    return (this._data.reminders || []).filter((r) => r.enabled);
  }

  async addReminder(userId, type, time, timezone = 7) {
    const id = this.dbService.uuid();
    const reminder = {
      id,
      userId,
      type,
      time,
      timezone,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (!this._data.reminders) this._data.reminders = [];
    this._data.reminders.push(reminder);
    await this._persist();
    return reminder;
  }

  async toggleReminder(userId, type, enabled) {
    const reminders = this._data.reminders || [];
    const reminder = reminders.find((r) => r.userId === userId && r.type === type);
    if (!reminder) return null;
    reminder.enabled = enabled;
    reminder.updatedAt = Date.now();
    await this._persist();
    return reminder;
  }

  async removeReminder(userId, type) {
    const before = (this._data.reminders || []).length;
    this._data.reminders = (this._data.reminders || []).filter(
      (r) => !(r.userId === userId && r.type === type),
    );
    const changed = before !== this._data.reminders.length;
    if (changed) await this._persist();
    return changed;
  }

  async setTime(userId, type, time) {
    const reminder = (this._data.reminders || []).find(
      (r) => r.userId === userId && r.type === type,
    );
    if (!reminder) return null;
    reminder.time = time;
    reminder.updatedAt = Date.now();
    await this._persist();
    return reminder;
  }
}

export default FitnessReminderRepository;
