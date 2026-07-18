import { PrayerService } from './prayer.service.js';
import { HijriService } from './hijri.service.js';
import { QiblaService } from './qibla.service.js';
import { ReminderService } from './reminder.service.js';
import { PrayerModeService } from './prayerMode.service.js';

export class IslamicService {
  constructor({ repo, client, logger, eventBus }) {
    this.repo = repo;
    this.client = client;
    this.logger = logger;
    this.eventBus = eventBus;

    this.prayer = new PrayerService({ repo, logger });
    this.hijri = new HijriService({ logger });
    this.qibla = new QiblaService({ logger });
    this.reminder = new ReminderService({ repo, prayerService: this.prayer, client, logger, eventBus });
    this.prayerMode = new PrayerModeService({ repo, logger, eventBus });
  }

  start() {
    this.reminder.start();
  }

  stop() {
    this.reminder.stop();
  }
}

export default IslamicService;
