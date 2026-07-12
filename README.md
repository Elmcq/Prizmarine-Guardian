# 🛡️ Prizmarine Guardian

A production-ready **WhatsApp group moderation bot** built with **Node.js 20 (ES Modules)**,
[`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js), **lowdb**, **Winston** and **node-cron**.

The bot automatically detects toxic language, issues escalating warnings, and temporarily bans
repeat offenders — while also defending groups against spam and message flooding.

---

## ✨ Features

- **Anti-Toxic detection** — Indonesian / English profanity, slurs, hate speech, harassment and
  spam insults. Word lists live in `data/badwords.json` (never hard-coded) and are matched
  case-insensitively with diacritic & light leetspeak tolerance.
- **Warning system** — every offence deletes the message (when permitted) and posts a ⚠️ warning
  with the offender `@mentioned` and their `n/3` progress. Warnings persist permanently.
- **Auto-ban** — at the warning limit the user is removed from the group and banned for
  `BAN_DURATION` (default 24h). A 🚫 notice is posted.
- **Auto-unban** — a per-minute job expires bans, removes them from the store, and DMs the user a
  rejoin invite link (if one is known for their group).
- **Anti-spam** — 5 messages within 10 seconds from one user triggers a warning.
- **Anti-flood** — 3 identical consecutive messages from one user triggers a warning.
- **🔞 NSFW module** — detects adult/sexual content (pornography, sexual terms, adult services,
  sexual harassment, adult links, sex toys) with **low / medium / high** severity tiers. High
  severity (or repeat offenders) triggers an **immediate** group removal + 24h ban without waiting
  for 3 warnings. Educational/medical context (biology, doctor, anatomy, …) is never flagged.
  All keywords live in `data/nsfw.json` (never hard-coded).
- **📢 Anti-Advertisement module** — detects *commercial* advertisements only, with **low**
  (selling products/items/accounts) and **medium** (promoting paid services) severity tiers that
  issue a warning. **High** severity — a repeat offender or mass advertisement spam — triggers an
  **immediate** group removal + 24h ban. Non-commercial shares (Discord/WhatsApp/Telegram invites,
  YouTube/TikTok/GitHub links, Minecraft servers, personal websites) are never flagged. All
  keywords and exemptions live in `data/advertisement.json` (never hard-coded).
- **🚨 Anti-Raid module** — detects group raids: **mass joins** (N users join in a
  window), **message raids** (very high message volume), **coordinated spam** (several
  different users posting near-identical promo/abusive messages), and **new-member
  abuse** (a fresh joiner immediately tripping toxic/NSFW/ad/spam/flood detection).
  When a threshold is exceeded it enables **Raid Mode**, logs an incident, DMs the
  group admins, and *increases moderation sensitivity* while active. All thresholds
  live in `data/raid.json` (never hard-coded).
- **💠 Anti-Sticker Spam module** — detects **sticker floods** (N stickers from one
  user in a short window) and **duplicate sticker spam** (N identical stickers sent
  in a row by one user). Detection is **strictly per-user** — different users sending
  stickers are never punished together. Both detectors issue a warning via the shared
  warning store (so the `warnLimit` produces a ban). **Coordinated** sticker spam
  (many different users sending stickers in a short window) is a **log-only** event
  because the Anti-Raid module already handles group-wide raids. All configuration
  lives in `data/sticker.json` (never hard-coded).
- **Admin commands** — `!warn`, `!clearwarn`, `!warnings`, `!ban`, `!unban`, `!kick`,
  `!tempban`, `!antinsfw`, `!reloadnsfw`, `!antiad`, `!reloadad`, `!antiraid`,
  `!raidmode`, `!raidstatus`, `!reloadraid`, `!antisticker`, `!stickerstatus`,
  `!reloadsticker`, `!rules`, `!rule`, `!addrule`, `!editrule`, `!deleterule`,
  `!exportrules`, `!settings`, `!help`, `!stats`, `!memory`, `!uptime`.
- **📜 Rule Management** — a dynamic, file-backed rulebook (`data/rules.json`). Members
  can read the rules with `!rules` / `!rule`; owners can `!addrule`, `!editrule`,
  `!deleterule` and `!exportrules` (with full validation: no duplicate IDs, no empty
  title/description, only `Warn` / `Kick` / `TempBan` / `Ban` punishments). Every
  moderation command — `!warn`, `!kick`, `!ban`, `!tempban` — accepts a rule id
  (e.g. `!ban @user R4`) and auto-loads the rule's title and description into the
  notice, so moderators never type reasons by hand. Rule changes are logged with
  moderator, timestamp and old/new values.
- **Observability** — Winston logging (console + `logs/`), per-command rate limiting & cooldown,
  a health heartbeat, and runtime statistics.
- **Reliability** — automatic backup every 12h, graceful shutdown, QR authentication,
  automatic reconnect, and an event-based architecture.

---

## 📋 Requirements

- **Node.js 20+** (`node -v`)
- A desktop **Chrome/Chromium** is downloaded automatically by Puppeteer on install.
- A WhatsApp account you control, used to scan the QR code.

---

## 🚀 Installation

```bash
# 1. Clone / copy this folder, then install dependencies
npm install
```

> ⚠️ `npm install` downloads a prebuilt Chromium (~150 MB) for Puppeteer. Ensure you have
> outbound internet access. If you already have Chrome and want to skip the download, set
> `PUPPETEER_SKIP_DOWNLOAD=true` and point Puppeteer at your browser via `executablePath` in
> `src/index.js`.

```bash
# 2. Configure environment
cp .env.example .env
#   edit .env and set at least OWNER to your WhatsApp number (digits only, no "+")
#   if the bot doesn't recognize you as owner in groups, also set OWNER_LID
#   (check pm2 logs for "LID resolved:" to find your LID)
```

---

## ▶️ How to run

```bash
npm start          # production
npm run dev        # auto-restart on file changes (node --watch)
```

On first run a **QR code** is printed in the terminal. Open WhatsApp → Linked Devices → Link a
device and scan it. The session is cached in `.wwebjs_auth/` (LocalAuth), so you normally only
scan once.

---

## ⚙️ Configuration (`.env`)

| Variable        | Default              | Description                                              |
| --------------- | -------------------- | -------------------------------------------------------- |
| `BOT_NAME`      | `Prizmarine Guardian` | Display name used in log lines & messages.              |
| `PREFIX`        | `!`                  | Command prefix.                                          |
| `OWNER`         | _(required)_         | Bot owner number, digits only (e.g. `6281234567890`). Immune to moderation; may run every command. |
| `OWNER_LID`     | _(optional)_         | WhatsApp LID for the owner (e.g. `12345678901234@lid`). Required when group messages use LID privacy instead of the phone number. Check bot logs (`LID resolved:`) to find your LID. |
| `WARN_LIMIT`    | `3`                  | Warnings before an automatic ban.                       |
| `BAN_DURATION`  | `86400000`           | Ban length in milliseconds (86400000 = 24 hours).       |
| `LOG_LEVEL`     | `info`               | Winston level: `error` \| `warn` \| `info` \| `debug`.   |

Optional tuning (also overridable in `.env`): `SPAM_MESSAGE_COUNT`, `SPAM_WINDOW_MS`,
`FLOOD_IDENTICAL_COUNT`, `COMMAND_COOLDOWN_MS`, `COMMAND_RATE_LIMIT`, `COMMAND_RATE_WINDOW_MS`,
`BACKUP_INTERVAL_HOURS`.

To pre-seed a rejoin link for a group, add `INVITE_LINK_<groupId>=https://chat.whatsapp.com/...`
to `.env` (links are also auto-captured at startup when the bot is a group admin).

---

## 💬 Commands (admin only, except `!help`)

| Command            | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `!warn @user [reason]`     | Manually warn a user (counts toward the ban limit).  |
| `!clearwarn @user`         | Reset a user's warnings to zero.                     |
| `!warnings`                 | List all stored warnings.                            |
| `!ban @user [reason]`      | Instantly ban a user for `BAN_DURATION`.             |
| `!unban @user`             | Remove a user's active ban.                          |
| `!settings`                | Show current configuration.                           |
| `!antinsfw on`             | Enable the NSFW moderation module.                    |
| `!antinsfw off`            | Disable the NSFW moderation module.                  |
| `!reloadnsfw`              | Reload `data/nsfw.json` without restarting.           |
| `!antiad on`               | Enable the Anti-Advertisement module.                |
| `!antiad off`              | Disable the Anti-Advertisement module.               |
| `!reloadad`                | Reload `data/advertisement.json` without restarting. |
| `!antiraid on`             | Enable the Anti-Raid module.                         |
| `!antiraid off`            | Disable the Anti-Raid module.                        |
| `!raidmode on`             | Manually enable Raid Mode for this group.            |
| `!raidmode off`            | Manually disable Raid Mode for this group.           |
| `!raidstatus`              | Show Anti-Raid config + current Raid Mode state.     |
| `!reloadraid`              | Reload `data/raid.json` without restarting.          |
| `!antisticker on`         | Enable the Anti-Sticker Spam module.                 |
| `!antisticker off`        | Disable the Anti-Sticker Spam module.                |
| `!stickerstatus`          | Show Anti-Sticker config + recent incidents.         |
| `!reloadsticker`          | Reload `data/sticker.json` without restarting.       |
| `!rules`                   | List all community rules (members can use).          |
| `!rule R2`                 | Show the full detail of rule `R2`.                   |
| `!kick @user [R3]`         | Kick a user (optionally cite a rule).                |
| `!tempban @user 7d [R5]`   | Temporarily ban a user for a duration (cite a rule). |
| `!addrule R8 \| Title \| Desc \| Punishment` | Owner: add a rule.                  |
| `!editrule R8 title New`   | Owner: edit a rule's title/description/punishment.   |
| `!deleterule R8`           | Owner: delete a rule.                                |
| `!exportrules`             | Owner: export `rules.json` as a file.                |
| `!help`                    | List available commands (filtered by your rights).   |
| `!stats`                   | Bot statistics (+ NSFW, AD & Raid info).             |
| `!memory`                  | Process memory usage.                                |
| `!uptime`                  | How long the bot has been running.                   |

> The **owner** (set in `.env`) can always run admin commands, even from a DM. In groups, group
> admins may run them too. Owners, group admins and the bot itself are **never** auto-warned or
> auto-banned.

---

## 🔞 NSFW Module

The NSFW module is a **standalone, add-on moderation system** that shares the bot's existing
architecture but never duplicates it: `NSFWService` only *detects*, while the battle-tested
`ModerationService` *decides and applies* the punishment (warnings, group removal, bans). The two
are wired together by a separate event listener (`src/handlers/nsfwHandler.js`) so the original
message handler is untouched.

### How it works

1. Every incoming group message is scanned by `NSFWService.detect(text)`, which:
   - sanitizes the text (lowercase, diacritic & light leetspeak tolerance),
   - matches against category keyword lists loaded **dynamically** from `data/nsfw.json`,
   - returns `{ detected, severity, category, matched }` — picking the **highest** severity tier
     when several categories match.
2. A **false-positive guard** immediately clears anything that looks like an educational/medical
   discussion (tokens such as `education`, `biology`, `reproduction`, `health`, `doctor`, `medical`,
   `anatomy`, `pregnancy`, `school`, `lesson`, `science`, `nurse`, `hospital`, …). These are **never**
   flagged.
3. The handler escalates **repeat offenders**: if a user already has ≥ 1 prior warning in the group,
   the severity is bumped to `high`.
4. `ModerationService` applies the consequence (see severity model below), and the event is recorded
   in `data/nsfw.json` (`incidents`) and reflected in `!stats`.

### Severity model

| Severity | Examples                                          | Action                                                            |
| -------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `low`    | Pornography keywords, sexual terminology, vulgar  | `⚠️` warning (`1/3`), message deleted.                            |
|          | sexual language, sex-toy names                    |                                                                   |
| `medium` | Sexual harassment, requesting explicit images,    | `⚠️` warning (`1/3`) + incident logged.                           |
|          | adult-service solicitation                        |                                                                   |
| `high`   | Porn websites, distribution of explicit content,  | **Immediate** group removal + 24h ban — does **not** wait for     |
|          | malicious adult links, or repeat after a warning  | 3 warnings.                                                       |

All keyword lists are empty by default-ish starters in `data/nsfw.json` and can be edited, extended,
or reloaded live with `!reloadnsfw` — **no code changes and no restart required**.

### `data/nsfw.json` structure

```json
{
  "enabled": true,
  "warnLimit": 3,
  "highSeverityBan": true,
  "categories": {
    "sexual_terms": [],
    "pornography": [],
    "adult_services": [],
    "sexual_harassment": [],
    "adult_links": [],
    "sex_toys": []
  },
  "incidents": []
}
```

- `enabled` — master switch toggled by `!antinsfw on|off`.
- `warnLimit` — how many `low`/`medium` warnings trigger a normal ban (default 3).
- `highSeverityBan` — whether `high` severity triggers an immediate ban.
- `categories` — the keyword lists per severity bucket (populate these).
- `incidents` — append-only log of `{ timestamp, group, user, category, severity, matched, action }`.

### Commands

- `!antinsfw on|off` — enable or disable the whole module (persisted to `data/nsfw.json`).
- `!reloadnsfw` — re-read `data/nsfw.json` at runtime after you edit the keyword lists.

### Statistics

`!stats` gains four NSFW-aware lines: **NSFW Detections**, **NSFW Warnings**, **NSFW Bans**, and
**Most Triggered Category** (computed from the incidents log).

---

## 📢 Anti-Advertisement Module

Like the NSFW module, this is a **standalone, add-on moderation system** that reuses the bot's
shared architecture: `AdvertisementService` only *detects*, while `ModerationService` *decides and
applies* the punishment. A separate event listener (`src/handlers/advertisementHandler.js`) wires
them together, so the toxic and NSFW flows are untouched.

> **Goal:** stop **commercial** advertisements only. Non-commercial shares are explicitly exempt
> (see below), so communities can still post invites and links freely.

### How it works

1. Every incoming group message is scanned by `AdvertisementService.detect(text)`:
   - sanitizes the text (lowercase, diacritic & light leetspeak tolerance),
   - **first** checks the exemption list (non-commercial contexts) and returns `detected:false`
     immediately if matched,
   - then matches against category keyword lists loaded **dynamically** from
     `data/advertisement.json`, returning `{ detected, severity, category, matched }`.
2. The handler escalates to **HIGH** severity when the sender is a **repeat offender** (any prior
   warning in the group) or is sending **mass advertisement spam** (≥ 3 ad detections within 10s
   from the same user).
3. `ModerationService` applies the consequence (see severity model), and the event is recorded in
   `data/advertisement.json` (`incidents`) and reflected in `!stats`.

### Severity model

| Severity | Category                | Examples                          | Action                                          |
| -------- | ----------------------- | -------------------------------- | ----------------------------------------------- |
| `low`    | `selling`               | Products / items / accounts for sale | `⚠️` warning (`1/3`), message deleted.       |
| `medium` | `service_promotion`     | Promoting paid services          | `⚠️` warning (`1/3`) + incident logged.         |
| `high`   | (dynamic)               | Repeat offender / mass ad spam   | **Immediate** group removal + 24h ban.          |

### Never flagged (exemptions)

The following are **non-commercial** and are suppressed by the exemption list in
`data/advertisement.json` — they will *never* trigger a warning or ban:

- Discord invites · WhatsApp group invites · Telegram links
- YouTube · TikTok · GitHub repositories
- Minecraft servers · personal websites / blogs / portfolios

### `data/advertisement.json` structure

```json
{
  "enabled": true,
  "warnLimit": 3,
  "highSeverityBan": true,
  "categories": {
    "selling": [],
    "service_promotion": []
  },
  "exemptions": [
    { "label": "youtube", "pattern": "(youtube\\.com/|youtu\\.be/)" }
  ],
  "incidents": []
}
```

- `enabled` — master switch toggled by `!antiad on|off`.
- `warnLimit` — how many `low`/`medium` warnings trigger a normal ban (default 3).
- `highSeverityBan` — whether `high` severity triggers an immediate ban.
- `categories` — the keyword lists per severity bucket (populate these).
- `exemptions` — regex patterns for non-commercial contexts that must never be flagged.
- `incidents` — append-only log of `{ timestamp, group, user, category, severity, matched, action }`.

### Commands

- `!antiad on|off` — enable or disable the whole module (persisted to `data/advertisement.json`).
- `!reloadad` — re-read `data/advertisement.json` at runtime after you edit keywords/exemptions.

### Statistics

`!stats` gains four Advertisement-aware lines: **AD Detections**, **AD Warnings**, **AD Bans**, and
**Most Triggered Category** (computed from the incidents log).

---

## 🚨 Anti-Raid Module

A **standalone, event-driven** module for defending groups against coordinated raids. It
reuses the shared architecture: `RaidService` only *tracks events and detects*; `ModerationService`
*decides and applies* punishment (ban/remove). Three independent listeners are registered
(`group_join`, `message`, and the EventBus `warning:issued` event) so the toxic / NSFW /
advertisement / spam flows are never modified.

### What it detects

| Detector            | Default threshold                                  | Notes                                                            |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `mass_join`         | **10 users join within 60s**                       | Tracked from the `group_join` event.                            |
| `message_raid`      | **100 messages within 30s**                        | Group-wide message volume.                                      |
| `coordinated`       | **3 different users** posting near-identical msgs | Similarity via Levenshtein ratio (default ≥ 0.8) within 15s.   |
| `new_member_abuse`  | a recent joiner trips another detector            | Signalled when a `warning:issued` hits a user who just joined.  |

### When a threshold is exceeded

1. **Raid Mode is enabled** for the group (auto, if `autoRaidMode` is on; or manually via `!raidmode on`).
2. An **incident is logged** to `data/raid.json` (`incidents`).
3. **Admins are notified** (DM'd individually; falls back to a group message).
4. **Moderation sensitivity is increased** while Raid Mode is active:
   - the raid detectors' count thresholds are multiplied by the `sensitivity.raidMode`
     multipliers (default 0.5) so raids re-trigger faster;
   - **coordinated-spam participants are banned immediately**;
   - **new members who abuse the group during Raid Mode are banned immediately** (no 3-warning ladder).

Raid Mode auto-expires after `raidModeDurationMs` (default 5 min); the `SchedulerService` expires
it and prunes the transient tracking buffers every minute.

### `data/raid.json` structure

```json
{
  "enabled": true,
  "autoRaidMode": true,
  "raidModeDurationMs": 300000,
  "notifyAdmins": true,
  "thresholds": {
    "massJoin": { "count": 10, "windowMs": 60000 },
    "messageRaid": { "count": 100, "windowMs": 30000 },
    "coordinated": { "minUsers": 3, "windowMs": 15000, "similarity": 0.8 },
    "newMemberAbuse": { "windowMs": 60000, "minCount": 1 }
  },
  "sensitivity": { "raidMode": { "massJoinMultiplier": 0.5, "messageRaidMultiplier": 0.5, "coordinatedMultiplier": 0.5 } },
  "raidMode": {},
  "incidents": []
}
```

- `autoRaidMode` — auto-enable Raid Mode when a threshold is crossed.
- `raidModeDurationMs` — how long Raid Mode stays active before auto-expiry.
- `thresholds` — the four detectors (all editable, never hard-coded).
- `sensitivity.raidMode` — multipliers applied to count thresholds *while Raid Mode is active*.
- `raidMode` — persisted per-group lockdown state (`{ active, since, until }`).
- `incidents` — append-only log of `{ timestamp, group, type, users }`.

### Commands

- `!antiraid on|off` — enable or disable the whole module.
- `!raidmode on|off` — manually enable/disable Raid Mode for the current group.
- `!raidstatus` — show config, current Raid Mode state, and recent incidents.
- `!reloadraid` — re-read `data/raid.json` at runtime after editing thresholds.

### Statistics

`!stats` gains **Raid Incidents** and **Active Raid Modes** lines (from the incidents log).

---

## 💠 Anti-Sticker Spam Module

A **standalone, event-driven** module for catching sticker spam. It registers its own
independent `message` listener, so the toxic / NSFW / advertisement / raid flows are
never touched. `StickerService` **only detects**; the `stickerHandler` decides what to
do and reuses `ModerationService` for warnings and bans (so reaching the shared
`warnLimit` produces a group removal + 24h ban, exactly like every other module).

### Detectors

| Detector            | Trigger                                              | Action                                   |
| ------------------- | ---------------------------------------------------- | ---------------------------------------- |
| **Sticker Flood**   | `maxStickers` (default **5**) stickers from **one user** within `timeWindow` (default **15s**) | `+1 warning` (shared store) |
| **Duplicate Sticker** | `duplicateLimit` (default **3**) **identical** stickers sent **in a row** by **one user** (matched by media file hash) | `+1 warning` (shared store) |
| **Coordinated**     | `coordinated.minUsers` (default **5**) **different** users sending stickers within `coordinated.windowSec` (default **10s**) | **LOG ONLY** — emits a `sticker:event` and writes an incident; **no warning, no ban** |

> **Per-user isolation:** every counter is keyed by `groupId:userId` (and the duplicate
> counter by the sticker's content hash). A different user flooding stickers is **never**
> punished for someone else's activity — only an individual's own flood / duplicate counts.
> Group-wide raids are already handled by the **Anti-Raid** module, which is why the
> coordinated detector is log-only here.

### What happens on a warning

1. The offending sticker message is deleted (when the bot has permission).
2. A ⚠️ warning is posted with the offender `@mentioned` and their `n/warnLimit` progress.
3. The warning is recorded in the shared warning store. At `warnLimit` the user is
   removed and banned for `BAN_DURATION` (default 24h); a 🚫 notice is posted.

### Coordinated spam (log-only)

When many *different* users send stickers in a short window, the bot **does not** warn or
ban — it only writes a `coordinated` incident (`action: "log"`) and emits
`sticker:event` on the EventBus (consumed by logging / observability). Anti-Raid owns
the response to group-wide raids, avoiding double punishment.

### Configuration — `data/sticker.json`

```json
{
  "enabled": true,
  "maxStickers": 5,
  "timeWindow": 15,
  "duplicateLimit": 3,
  "warnLimit": 3,
  "coordinated": { "minUsers": 5, "windowSec": 10 },
  "incidents": []
}
```

- `enabled` — master on/off switch for the whole module (persisted; toggled by `!antisticker`).
- `maxStickers` — stickers from one user within `timeWindow` that trip a flood warning.
- `timeWindow` — flood window, in **seconds**.
- `duplicateLimit` — identical consecutive stickers from one user that trip a duplicate warning.
- `warnLimit` — shared warning-store limit; reaching it produces a ban.
- `coordinated` — log-only group detector (`minUsers`, `windowSec`).

### Commands

- `!antisticker on|off` — enable or disable the whole module (persisted to `data/sticker.json`).
- `!stickerstatus` — show config, the active thresholds, and recent incidents.
- `!reloadsticker` — re-read `data/sticker.json` at runtime after editing thresholds.

### Statistics

`!stats` gains a **Sticker** block: **Total incidents**, **by type** (flood / duplicate /
coordinated), **Warnings issued**, and **Coordinated logs** (computed from the incidents log).

---

## 📜 Rule Management Module

A **standalone, file-backed rulebook** for the community. Every rule lives in
`data/rules.json` (never hard-coded) and is loaded dynamically by `RuleService`.
`RuleRepository` only persists; `RuleService` owns validation, lookups and the
`parseModerationArgs` helper that lets moderation commands resolve a `Rxx` token
from a message.

### Reading the rules

| Command      | Who can use | Description                                            |
| ------------ | ----------- | ------------------------------------------------------ |
| `!rules`     | Everyone    | Lists every rule as `R1 • Title`.                     |
| `!rule R2`   | Admins      | Shows the full title, description and default punishment. |

### Managing the rules (owner only)

| Command                                  | Description                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| `!addrule R8 \| Title \| Desc \| Punish` | Add a rule (fields separated by `\|`).                 |
| `!editrule R8 title New Title`           | Edit one field: `title`, `description` or `punishment`. |
| `!editrule R8 punishment TempBan`        | Change the default punishment.                        |
| `!deleterule R8`                         | Remove a rule.                                         |
| `!exportrules`                           | Send `rules.json` as a downloadable document.          |

Validation (enforced by `RuleService`) rejects:
- **Duplicate** rule IDs (matched case-insensitively),
- **Empty** titles or descriptions,
- **Invalid** punishments — only `Warn`, `Kick`, `TempBan`, `Ban` are accepted
  (any casing is normalised, e.g. `warn` → `Warn`).

Every create / edit / delete is logged with the **moderator**, **timestamp**,
**old value** and **new value** (emitted on the EventBus as `rule:changed` and
written via the logger).

### Citing a rule when moderating

`!warn`, `!kick`, `!ban` and `!tempban` accept a rule id so the bot writes the
notice for you — no manual reason needed:

```
!warn   @user R2
!kick   @user R3
!ban    @user R4
!tempban @user 7d R5
```

When a rule is cited, the moderation message automatically includes:

```
⚠️ PRIZMARINE GUARDIAN MODERATION

User:
@user

Action:
Warning          (or Kick / TempBan / Ban)

Rule Violated:
R2 • Respect Staff Decisions

Reason:
<rule description>

Moderator:
@admin
```

`!tempban` understands duration tokens `7d`, `12h`, `30m`, `1w`; without one it
falls back to the configured `BAN_DURATION`.

### `data/rules.json` structure

```json
{
  "rules": {
    "R1": { "title": "Respect Everyone", "description": "…", "punishment": "Warn" }
  }
}
```

---

## 🌐 Web Dashboard

A built-in, owner-authenticated web dashboard runs **in the same process as the
bot** (Express + a small vanilla-JS UI). It shows live stats, manages rules
(CRUD), and toggles/edits the four moderation modules — reusing the bot's own
repositories and services, so changes take effect immediately.

### Enable it
The dashboard only starts when `DASHBOARD_TOKEN` is set. Generate a strong token:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Then in `.env`:

```env
DASHBOARD_PORT=3000
DASHBOARD_HOST=0.0.0.0
DASHBOARD_TOKEN=<the long random string from above>
```

Restart the bot. You should see:

```
Dashboard listening on http://0.0.0.0:3000
```

Open `http://<your-server>:3000`, enter the token once, and you're in. The token
is stored in an HttpOnly session cookie (24h). Log out clears it.

### What you can do
- **Overview** — uptime, active bans, total warnings, messages seen, memory, per-module stats.
- **Modules** — turn NSFW / Advertisement / Raid / Sticker on or off and edit their limits (warn limit, Raid Mode duration, sticker thresholds, …). Saving reloads the live service instantly.
- **Rules** — create, edit, and delete rules (same validation as `!addrule`/`!editrule`/`!deleterule`).
- **Incidents / Bans / Warnings** — read-only recent-activity tables, filterable by module.

### Security
- The dashboard is **single-owner**: anyone with `DASHBOARD_TOKEN` gets full control. Keep it secret.
- The session cookie is **not** marked `Secure`, so it works over plain HTTP (SSH tunnel / LAN) but travels unencrypted. For any internet-facing deployment, put it behind an **HTTPS reverse proxy (nginx)** and firewall the port, e.g.:

  ```nginx
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  ```

- Sessions are in-memory and cleared on restart (re-login required). This is fine for single-owner use.
- If `DASHBOARD_TOKEN` is empty, the dashboard stays disabled and the bot logs `Dashboard disabled`.

### Endpoints (JSON, auth required except login)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/auth/login` | unlock with `{ "token": "…" }` |
| POST | `/api/auth/logout` | end session |
| GET | `/api/overview` | aggregated stats |
| GET | `/api/modules` | list modules |
| PUT | `/api/modules/:key` | toggle `enabled` + edit settings |
| GET | `/api/rules` | list rules |
| POST | `/api/rules` | add rule |
| PUT | `/api/rules/:id` | edit a rule field |
| DELETE | `/api/rules/:id` | delete rule |
| GET | `/api/data/incidents?module=&limit=` | recent incidents |
| GET | `/api/data/bans` | bans |
| GET | `/api/data/warnings` | warnings |

---

## 📁 Folder structure

```
prizmarine-anti-toxic/
├── src/
│   ├── index.js            # Bootstrap, client, QR, reconnect, graceful shutdown
│   ├── config/             # env loading + constants (paths, events, limits)
│   ├── handlers/           # WhatsApp event wiring (message, ready, connection)
│   ├── commands/           # One module per command + the registry
│   ├── database/           # DatabaseService (lowdb wrapper) + repositories
│   ├── services/           # Toxicity, Moderation, Spam, RateLimiter, Backup, Health, Scheduler
│   ├── web/                # Optional Express dashboard (auth, schemas, routes, factory)
│   ├── middleware/         # auth, rate-limit, cooldown
│   ├── utils/              # sanitize, time, mentions, formatter
│   ├── logger/             # Winston configuration
│   └── events/             # EventBus (decoupled domain events)
├── data/                   # warnings.json, bans.json, settings.json, badwords.json, nsfw.json, advertisement.json, raid.json, sticker.json, rules.json, backups/
├── public/                 # Dashboard static UI (index.html, styles.css, app.js)
├── logs/                   # Winston output (combined.log, error.log)
├── .wwebjs_auth/           # Cached WhatsApp session (created on first login)
├── .env                    # Your configuration
├── package.json
└── README.md
```

---

## 📸 Example screenshots

> Real WhatsApp captures can't be generated here, so these are faithful text mock-ups of the
> messages the bot sends.

**Warning (after a toxic message):**

```
⚠️ WARNING

@6281234567890

Toxic language detected.

Warning: 1/3

Please respect other members.
```

**Auto-ban (at the warning limit):**

```
🚫 PRIZMARINE GUARDIAN

@6281234567890 has reached the warning limit.

Action Taken:
• Removed from group
• 24 hour ban
```

**Auto-unban DM (ban expired):**

```
Your 24 hour ban has expired.
You may rejoin using the invite link:
https://chat.whatsapp.com/XXXXXXXXXXXX
```

**Terminal (first run):**

```
 ████████████████████████████████
 ████████████████████████████████
 ████  ██████  ████  ███  ██████
 ████  ████  ████  ███  ████████
        ... QR code ...
 ████████████████████████████████

[INFO] QR code generated — scan it with WhatsApp to authenticate.
[INFO] Session authenticated.
[INFO] Prizmarine Guardian is ready!
```

---

## 🩺 Health, backup & recovery

- **Backups:** every 12h the four JSON files are copied to `data/backups/<timestamp>/` (the 14
  most recent are kept). To restore, stop the bot and copy a backup back into `data/`.
- **Health:** a heartbeat is logged every 5 minutes (`!stats` / `!memory` / `!uptime` show live
  figures).
- **Reconnect:** on a transient disconnect the bot automatically re-initialises after 5s. A
  `LOGOUT` requires deleting `.wwebjs_auth/` and re-scanning the QR.
- **Graceful shutdown:** `Ctrl-C` (SIGINT) or `SIGTERM` stops the scheduler, destroys the client
  and exits cleanly.

---

## 🧩 Extending the bot

- **Add toxic words:** edit `data/badwords.json` (categories: `indonesian`, `english`, `slurs`,
  `hateSpeech`, `harassment`, `spamInsults`) and optionally `patterns` (regex, applied to the
  sanitised text). No restart needed if you add a `!reloadbadwords` command or call
  `ToxicityService.reload()` from a handler.
- **Add a command:** create `src/commands/<name>.js` exporting
  `{ name, description, adminOnly, usage, run(ctx) }` and register it in `src/commands/index.js`.

---

## ⚠️ Disclaimer

This tool is intended for groups you own or administer. Automating a WhatsApp account may violate
WhatsApp's Terms of Service; use it responsibly and at your own risk.
