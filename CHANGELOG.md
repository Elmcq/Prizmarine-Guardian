# Changelog

## v1.4.0

**Sport & Fitness Module — Calculators, Workout, Nutrition, Reminders**

Status: Feature Release

### Added
- `!bmi <berat> <tinggi>` — Body Mass Index calculator
- `!bmr <gender> <usia> <berat> <tinggi>` — Basal Metabolic Rate calculator
- `!tdee <gender> <usia> <berat> <tinggi> <aktivitas>` — Total Daily Energy Expenditure
- `!water <berat>` — rekomendasi asupan air harian
- `!idealweight <tinggi>` — estimasi berat badan ideal
- `!caloriesburn <aktivitas> <berat> <menit>` — hitung kalori terbakar (walking, running, cycling, workout)
- `!pace <distance_km> <time_min>` — hitung pace lari
- `!workout [level]` — workout harian (beginner/intermediate/advanced)
- `!exercise [level]` — alias untuk !workout
- `!stretch` — stretching routine
- `!fitness reminder on/off` — aktifkan/nonaktifkan fitness reminder
- `!fitness workout <HH:MM>` — atur waktu workout reminder
- `!fitness meal <HH:MM>` — atur waktu meal reminder
- `FitnessReminderRepository` — persistence layer (data/fitness.json)
- `FitnessReminderScheduler` — cron-based reminder (workout + meal)
- 7 calculator modules (BMI, BMR, TDEE, Water, IdealWeight, CaloriesBurned, Pace)
- 50+ kota Indonesia database (from Islamic module)

### Changed
- `src/config/constants.js` — added `fitness` to DB_FILES and DEFAULTS
- `src/database/DatabaseService.js` — added fitness getter and initialization
- `src/index.js` — wired FitnessReminderRepository, FitnessReminderScheduler
- `src/commands/index.js` — registered all fitness commands (12 new commands)

### Fixed
- Scheduler reliability for fitness reminders
- Timezone handling in fitness reminders (Asia/Jakarta, UTC+7)

---

## v1.3.0

**Islamic Module — Prayer Times, Hijri Calendar, Qibla, Auto-Lock**

Status: Feature Release

### Added
- `!sholat [kota]` — jadwal sholat harian (50+ kota Indonesia, perhitungan astronomi lokal)
- `!hijri` — tanggal Hijriyah (algoritma Tabular Islamic Calendar / Kuwaiti)
- `!qibla [kota]` — arah kiblat dari lokasi grup (perhitungan bearing lokal)
- `!prayermode on/off [menit]` — mode sholat (blokir semua command kecuali Islamic)
- `!islamic reminder on/off` — pengingat sholat otomatis (adzan + iqomah)
- `!islamic autolock on/off` — auto-lock group sebelum Maghrib, auto-unblock setelahnya
- `!islamic lockbefore <menit>` — atur waktu lock sebelum Maghrib (default: 5 menit)
- `!islamic lockafter <menit>` — atur waktu unlock setelah Maghrib (default: 15 menit)
- `!islamic timezone <angka>` — atur timezone (default: UTC+7)
- `PrayerService` — perhitungan waktu sholat lokal (KEMENAG method), tidak perlu API eksternal
- `HijriService` — konversi Gregorian → Hijriyah (algoritma Tabular)
- `QiblaService` — perhitungan bearing arah kiblat dari koordinat
- `ReminderService` — cron scheduler untuk pengingat adzan + iqomah + auto-lock/unlock
- `PrayerModeService` — sesi temporary blokir command selama sholat
- `IslamicRepository` — persistence layer (data/islamic.json)
- `Indonesian Cities Database` — 50+ kota dengan koordinat (Surabaya, Jakarta, Malang, dll)

### Changed
- `src/config/constants.js` — added `islamic` to DB_FILES and DEFAULTS, `PRAYER_REMINDER` event
- `src/config/islamic.config.js` — prayer names mapping (Subuh, Dzuhur, Ashar, dll)
- `src/database/DatabaseService.js` — added islamic getter and initialization
- `src/handlers/messageHandler.js` — prayer mode blocks non-Islamic commands
- `src/index.js` — wired IslamicService, IslamicRepository, scheduler integration
- `src/commands/index.js` — registered sholat, hijri, qibla, prayermode, islamic commands
- All Islamic command help text uses Indonesian names (Subuh, Dzuhur, Ashar, Isya)

### Fixed
- Prayer times: Asr calculation (was using timezone fraction instead of latitude)
- Prayer times: formatTime (was multiplying by 15, producing 68:31 instead of 04:31)
- Prayer times: next prayer calculation (was comparing UTC server time against WIB times)
- Hijri date: year calculation (was showing -70967, now correct via Kuwaiti algorithm)
- Prayer names: display now uses Indonesian terms (Subuh, Dzuhur, Ashar, Isya)

### Architecture
- Local astronomical calculation — no external API dependency (MyQuran/Aladhan unreachable from server)
- All calculations use Asia/Jakarta (UTC+7) consistently
- `data/islamic.json` — auto-created, stores per-group settings and prayer cache

---

## v1.2.2

**Ticket Staff Permission Fix**

Status: Bug Fix Release

### Fixed
- `!tickets` and `!close` now check staff registration instead of WhatsApp admin status
- Staff added with `!addstaff` can now use ticket commands
- WhatsApp IDs normalized (strips `@c.us`, `@lid` suffixes) for staff lookup

### Added
- `isStaffByAuthorId()` method on StaffRepository for WhatsApp ID matching
- Regression tests for staff permission checks (88/88 total passing)

### Changed
- `src/commands/tickets.js` — `adminOnly: false`, custom staff permission check
- `src/commands/close.js` — `adminOnly: false`, custom staff permission check
- `src/database/repositories/StaffRepository.js` — added `isStaffByAuthorId()` method

---

## v1.2.1

**Staff Management System**

Status: Feature Release

### Added
- `!addstaff <phone> <name>` — register support staff (owner only)
- `!removestaff <phone>` — remove support staff (owner only)
- `StaffRepository` — persistence layer for staff (data/staff.json)
- `StaffService` — business logic with formatted output
- 19 tests for repository and service (76/76 total passing)
- `!close` command now checks staff registration in addition to admin status

### Changed
- `src/config/constants.js` — added `staff` to DB_FILES and DEFAULTS
- `src/database/DatabaseService.js` — added staff getter and initialization
- `src/index.js` — wired StaffRepository and StaffService
- `src/commands/index.js` — registered addstaff, removestaff commands
- `src/commands/close.js` — added staff permission check

---

## v1.2.0

**WhatsApp Ticket Support System**

Status: Feature Release

### Added
- `!ticket <category> [description]` — create a support ticket (categories: general, technical, abuse, feature, other)
- `!myticket` — view your open and closed tickets
- `!close <ticketId>` — close a support ticket (staff only)
- Auto-generated ticket IDs (TKT-0001 format)
- Ticket status: Open / Closed
- Per-user open ticket limit (max 3)
- `TicketRepository` — persistence layer for tickets (data/tickets.json)
- `TicketService` — business logic with formatted output
- 21 tests for repository and service (57/57 total passing)

### Changed
- `src/config/constants.js` — added `tickets` to DB_FILES and DEFAULTS
- `src/database/DatabaseService.js` — added tickets getter and initialization
- `src/index.js` — wired TicketRepository and TicketService
- `src/commands/index.js` — registered ticket, myticket, close commands

---

## v1.1.5

**Legacy Bug Report System Removed**

Status: Cleanup Release

### Removed
- `!reportbug` command — structured bug report form
- `!bugs` command — list all bug reports
- `!bugstatus` command — view/update report details
- `BugReportRepository` — persistence layer for bug reports
- `BugReportService` — business logic with formatted report output
- `bugreports` database definition from `DatabaseService.js`
- `bugreports` constants from `constants.js`
- `bugreports` wiring from `index.js`
- 19 bug report tests

### Reason
Preparing migration to WhatsApp Ticket Support System.

---

## v1.1.4

**English Profanity Expansion — 2,700+ words from better-profane-words**

Status: Stable Feature Release

### Added
- `better-profane-words` npm package — 2,725+ English profanity words with categories and intensity ratings
- Dynamic intensity-to-severity mapping (intensity 1-5 → severity 1-9)
- Category mapping: slur_racial → slurs, sexual → english, hateful_ideology → slurs, etc.
- `BadwordRepository.getAll()` now merges package words with JSON file words
- Words include: racial slurs, sexual terms, violence-related, hate speech, bodily functions

### Changed
- `src/database/repositories/BadwordRepository.js` — integrated better-profane-words package
- `test/toxicity.test.js` — updated tests to handle larger word lists (55/55 passing)

---

## v1.1.3

**Bug Report System — structured QA workflow**

Status: Stable Feature Release

### Added
- `!reportbug` command — structured bug report form with title, description, example, expected, actual
- `!bugs` command — list all bug reports with status filtering (admin only)
- `!bugstatus` command — view report details or update status/priority (admin only)
- Bug status lifecycle: 🟢 Open → 🔍 Investigating → 🛠 Fixing → 🧪 Testing → 🚀 Released → 🔴 Closed
- Priority system: Low / Medium / High / Critical
- Contributor credit system for changelog preparation
- `BugReportRepository` — persistence layer for bug reports
- `BugReportService` — business logic with formatted report output
- 19 tests for repository, service, and full lifecycle
- `authorName` added to command context for user display names

### Changed
- `src/config/constants.js` — added `bugreports` to DB_FILES and DEFAULTS
- `src/database/DatabaseService.js` — added bugreports getter and initialization
- `src/handlers/messageHandler.js` — added `authorName` to command context
- `src/commands/index.js` — registered reportbug, bugs, bugstatus commands
- `src/index.js` — wired BugReportRepository and BugReportService

---

## v1.1.2

**Literal Context Improvement — multi-meaning word detection**

Status: Stable Patch Release

### Added
- Literal context detection: recognizes when toxic words are used in non-insulting contexts (animal discussion, educational, object/literal meaning)
- New context pattern: `literal` with safe keywords (`hewan`, `binatang`, `peliharaan`, `lucu`, `foto`, `jenis`, `ras`, `mamalia`, `suka`, etc.)
- Score adjustment: literal context reduces score by -5
- 6 regression tests for multi-meaning word scenarios

### Fixed
- False positive: `"Anjing hewan lucu"` no longer triggers warning (literal context detected)
- False positive: `"Saya suka anjing peliharaan"` no longer triggers warning
- False positive: `"Anjing adalah hewan mamalia"` no longer triggers warning
- Improved context detection for words with multiple meanings (e.g., `anjing` = dog vs insult)

### Changed
- `data/badwords.json` — added `contextPatterns.literal` array with safe literal keywords
- `src/services/ContextualModerationPipeline.js` — Stage 3: literal context detection with word boundaries; Stage 6: literal context -5 scoring adjustment
- `test/toxicity.test.js` — expanded from 30 to 36 tests

### Contributors
- **@Altan** — QA testing and discovered literal context false positive issue

---

## v1.1.1

**Contextual Moderation Pipeline — QA improvements**

Status: Stable Patch Release

### Added
- Context patterns: `quotation` (quoted text detection), `discussion` (word-discussion patterns), `entityProtection` (presiden/pejabat/tokoh)
- Scoring adjustments: quotation (-6), discussion (-5), explaining (-4), criticism (-3)
- 8 regression tests for context/negation/education scenarios (test suite expanded from 23 to 31 tests)

### Fixed
- False positive: `"tidak goblok"` triggering warning (negation detection missed due to word-boundary issue)
- Score balancing: `"dasar goblok"` incorrectly escalated to MUTE instead of WARNING (severity 4 + no target context)
- Target detection: `"lo"` pronoun matching inside `"goblok"` substring — now uses word boundaries

### Changed
- `data/badwords.json` — expanded contextPatterns: `quotation`, `discussion`, `criticism`, `entityProtection`
- `src/services/ContextualModerationPipeline.js` — Stage 3: quotation/discussion/criticism/entityProtection detection; Stage 6: adjusted scoring weights; target detection uses word boundaries
- `test/toxicity.test.js` — expanded from 23 to 31 tests

---

## v1.1.0

**Contextual Moderation Pipeline — false positive reduction**

### Added
- Context-aware toxic detection (7-stage pipeline)
- Negation detection (`tidak`, `bukan`, `jangan`, `ga`, etc.)
- Target detection (`@mention`, pronouns, reply, direct address)
- Per-keyword severity scoring (configurable 0-10)
- Toxic score calculation with context weighting
- Warning cooldown (15s per user+word)
- Decision engine: `IGNORE` / `LOG_ONLY` / `WARNING` / `MUTE` / `BAN`
- Dashboard fields for threshold, cooldown, negation window

### Fixed
- False positive toxic warnings on educational/discussion messages
- Incorrect warning accumulation on quoted words

### Changed
- `data/badwords.json` — new fields: `severity`, `config`, `negations`, `contextPatterns`, `targetPronouns`
- `!antitoxic status` now shows contextual config

---

## v1.0.0

Initial release — Prizmarine Guardian

---

## Contributors

Special thanks:

* **@Yoga** — Reported initial false positive detection issue in v1.1.0
* **@Altan** — QA testing and discovered additional context detection issues for v1.1.1
