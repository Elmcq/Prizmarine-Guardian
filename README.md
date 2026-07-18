# 🛡️ Prizmarine Guardian

![Prizmarine Guardian Banner](https://i.ibb.co.com/zyFpPYf/New-Project.png)

**Author: [El McQQ](https://github.com/Elmcq)**

A production-ready **WhatsApp group moderation bot** built with **Node.js 20 (ES Modules)**,
[`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js), **lowdb**, **Winston** and **node-cron**.

The bot automatically detects toxic language, issues escalating warnings, and temporarily bans
repeat offenders — while also defending groups against spam and message flooding.

---

## ✨ Features

### Moderation

- **Anti-Toxic detection** — Indonesian / English profanity, slurs, hate speech, harassment.
  **8-stage Contextual Moderation Pipeline** (v1.2.0) with **4-tier word classification**
  (normal / sensitive / high / slurs) and **5-intent classification** (GENERAL_EXPRESSION,
  PERSONAL_ATTACK, SELF_REFERENCE, EDUCATIONAL, QUOTATION). Words from `better-profane-words`
  (2,725+) and `indonesian-badwords` (146+) are auto-merged into tiers at runtime.
- **Warning system** — every offence deletes the message and posts a ⚠️ warning with the
  offender `@mentioned` and their `n/3` progress. Warnings persist permanently.
- **Auto-ban** — at the warning limit the user is removed from the group and banned for
  `BAN_DURATION` (default 24h). A 🚫 notice is posted.
- **Auto-unban** — a per-minute job expires bans, removes them from the store, and DMs the user a
  rejoin invite link.
- **Anti-spam** — 5 messages within 10 seconds from one user triggers a warning.
- **Anti-flood** — 3 identical consecutive messages from one user triggers a warning.
- **🔞 NSFW module** — detects adult/sexual content with low / medium / high severity tiers.
  High severity triggers immediate group removal + 24h ban. Educational context is never flagged.
- **📢 Anti-Advertisement module** — detects commercial advertisements only. Non-commercial
  shares (Discord/WhatsApp/Telegram invites, YouTube/TikTok/GitHub links) are never flagged.
- **🚨 Anti-Raid module** — detects mass joins, message raids, coordinated spam, and new-member
  abuse. Enables Raid Mode with increased moderation sensitivity.
- **💠 Anti-Sticker Spam module** — detects sticker floods and duplicate sticker spam, per-user.

### Group Management

- **`!lock` / `!unlock`** — toggle admin-only messaging in groups.
- **`!kick` / `!ban` / `!tempban`** — remove or ban users (with optional rule citation).
- **📜 Rule Management** — dynamic, file-backed rulebook. `!rules` / `!rule` to read,
  `!addrule` / `!editrule` / `!deleterule` to manage. Moderation commands auto-load rule
  descriptions.

### Ticket Support System

- **WhatsApp-native tickets** — `!ticket` creates a ticket + a dedicated WhatsApp group.
- **Full lifecycle** — `!ticket` (create) → `!claim` (staff takes ownership) → `!resolve` (staff closes) → `!close` (admin force-close + kick all + bot leaves).
- **`!myticket`** — members see their own tickets.
- **`!tickets`** — staff lists all tickets.

### Staff Management

- **`!addstaff` / `!removestaff`** — owner manages staff roster (persisted in `data/staff.json`).
- Staff can use `!claim`, `!resolve`, `!tickets`.

### Web Dashboard

- **Owner-authenticated Express dashboard** — live stats, module toggle, rule CRUD, incident logs.

### Observability

- Winston logging, per-command rate limiting & cooldown, health heartbeat, runtime statistics.
- Automatic backup every 12h, graceful shutdown, QR authentication, automatic reconnect.

---

## 🧠 Contextual Moderation Pipeline (v1.2.0)

The AntiToxic module uses an **8-stage rule-based pipeline** with **4-tier word classification**
and **5-intent classification** to dramatically reduce false positives.

### Pipeline stages

| Stage | Name | What it does |
| ----- | ---- | ------------ |
| 1 | **Normalize** | Lowercase, strip WhatsApp formatting, normalize diacritics & leetspeak |
| 2 | **Keyword Detection** | Match against 4-tier word lists (normal/sensitive/high/slurs) |
| 3 | **Context Analysis** | Detect safe contexts: quotation, discussion, educational, literal, etc. |
| 4 | **Negation Detection** | Detect negation words within the negation window |
| 5 | **Target Detection** | Check for @mentions, pronouns, replies, or direct address |
| 6 | **Intent Classification** | Classify message intent (see below) |
| 7 | **Score Calculation** | Compute toxicScore from tier + intent + context + negation + target |
| 8 | **Decision Engine** | Map score to action: IGNORE / LOG_ONLY / WARNING / MUTE / BAN |

### Intent classification

| Intent | Description | Action |
| ------ | ----------- | ------ |
| `GENERAL_EXPRESSION` | Exclamation without target ("god damn", "what the hell") | **IGNORE** |
| `PERSONAL_ATTACK` | Directed at someone ("lu goblok") | **WARNING** |
| `SELF_REFERENCE` | Self-directed ("aku idiot") | **LOG_ONLY** |
| `EDUCATIONAL` | Teaching/explaining ("kata goblok termasuk kata kasar") | **LOG_ONLY** |
| `QUOTATION` | Quoting ("dia bilang goblok") | **LOG_ONLY** |

### 4-tier word classification

| Tier | Score | Examples | Behavior |
| ---- | ----- | -------- | -------- |
| `normal` | 0 | — | Never triggers |
| `sensitive` | 5 | goblok, tolol, bacot | Full contextual pipeline |
| `high` | 8 | anjing, bangsat, damn | High confidence, reduced context exceptions |
| `slurs` | 10 | nigger, faggot | Maximum severity, minimal exceptions |

`better-profane-words` (2,725+ English words) and `indonesian-badwords` (146+ words) are
automatically merged into appropriate tiers at runtime based on intensity and category.

### What this prevents

| Message | Old behavior | New behavior |
| ------- | ------------ | ------------ |
| `"god damn, again problem"` | ⚠️ WARNING | **IGNORE** (general expression) |
| `"damn, the server crashed"` | ⚠️ WARNING | **IGNORE** (general expression) |
| `"lu goblok"` | ⚠️ WARNING | ⚠️ WARNING (personal attack) |
| `"aku idiot"` | ⚠️ WARNING | **LOG_ONLY** (self-reference) |
| `"kata goblok termasuk kata kasar"` | ⚠️ WARNING | **LOG_ONLY** (educational) |
| `"tidak goblok"` | ⚠️ WARNING | **IGNORE** (negation detected) |

---

## 📋 Requirements

- **Node.js 20+**
- A desktop **Chrome/Chromium** (downloaded automatically by Puppeteer).
- A WhatsApp account you control.

---

## 🚀 Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd prizmarine-anti-toxic
npm install
```

```bash
# 2. Configure
cp .env.example .env
# Edit .env — set OWNER to your WhatsApp number (digits only)
# Set DASHBOARD_TOKEN for the web dashboard
```

---

## ▶️ How to run

```bash
npm start          # production
npm run dev        # auto-restart on file changes
```

On first run a **QR code** is printed. Scan it with WhatsApp → Linked Devices. Session is cached
in `.wwebjs_auth/`.

---

## ⚙️ Configuration (`.env`)

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `BOT_NAME` | `Prizmarine Guardian` | Display name |
| `PREFIX` | `!` | Command prefix |
| `OWNER` | _(required)_ | Bot owner number (digits only) |
| `OWNER_LID` | _(optional)_ | WhatsApp LID for the owner |
| `WARN_LIMIT` | `3` | Warnings before auto-ban |
| `BAN_DURATION` | `86400000` | Ban length in ms (24h) |
| `LOG_LEVEL` | `info` | Winston level |
| `DASHBOARD_TOKEN` | _(optional)_ | Enables web dashboard |

---

## 💬 Commands

### Moderation Commands

| Command | Description |
| ------- | ----------- |
| `!warn @user [R2] [reason]` | Warn a user (counts toward ban limit) |
| `!clearwarn @user` | Reset a user's warnings (admin only) |
| `!warnings` | List all stored warnings |
| `!ban @user [R4] [reason]` | Instantly ban a user |
| `!unban @user` | Remove a user's active ban |
| `!kick @user [R3] [reason]` | Kick a user from the group |
| `!tempban @user 7d [R5] [reason]` | Temporarily ban for a duration |
| `!lock` | Lock group — only admins can send messages |
| `!unlock` | Unlock group — all members can send |

### Module Commands

| Command | Description |
| ------- | ----------- |
| `!antitoxic on\|off` | Toggle AntiToxic module |
| `!reloadtoxic` | Reload `data/badwords.json` |
| `!antinsfw on\|off` | Toggle NSFW module |
| `!reloadnsfw` | Reload `data/nsfw.json` |
| `!antiad on\|off` | Toggle Anti-Advertisement module |
| `!reloadad` | Reload `data/advertisement.json` |
| `!antiraid on\|off` | Toggle Anti-Raid module |
| `!raidmode on\|off` | Manually enable/disable Raid Mode |
| `!raidstatus` | Show Raid config + state |
| `!reloadraid` | Reload `data/raid.json` |
| `!antisticker on\|off` | Toggle Anti-Sticker Spam module |
| `!stickerstatus` | Show Sticker config + incidents |
| `!reloadsticker` | Reload `data/sticker.json` |

### Rules

| Command | Description |
| ------- | ----------- |
| `!rules` | List all community rules |
| `!rule R2` | Show full rule detail |
| `!addrule R8 \| Title \| Desc \| Punish` | Add a rule (owner) |
| `!editrule R8 title New` | Edit a rule field (owner) |
| `!deleterule R8` | Delete a rule (owner) |
| `!exportrules` | Export `rules.json` as a file (owner) |

### Ticket Support

| Command | Description |
| ------- | ----------- |
| `!ticket` | Create a support ticket + WhatsApp group |
| `!myticket` | List your tickets |
| `!tickets` | Staff: list all tickets |
| `!claim` | Staff: claim a ticket |
| `!resolve` | Staff: resolve a claimed ticket |
| `!close` | Admin: close ticket + kick members + bot leaves |

### Staff Commands

| Command | Description |
| ------- | ----------- |
| `!addstaff @user Name` | Add a staff member (owner) |
| `!removestaff @user` | Remove a staff member (owner) |

### Info Commands

| Command | Description |
| ------- | ----------- |
| `!help` | List available commands |
| `!stats` | Bot statistics |
| `!memory` | Process memory usage |
| `!uptime` | How long the bot has been running |
| `!settings` | Show current configuration |

> The **owner** can always run admin commands. In groups, group admins may also run them.
> Owners, group admins and the bot are **never** auto-warned or auto-banned.

---

## 🎫 Ticket Support System

WhatsApp-native ticket system with full lifecycle management.

### How it works

1. **`!ticket`** — Creates a ticket record and a dedicated WhatsApp group `PRIZMARINE TICKET <id>`.
   The ticket creator is added to the group and receives a welcome message.
2. **`!claim`** — Staff claims the ticket, gets added to the group, and the ticket status changes
   to `Claimed`.
3. **`!resolve`** — Staff resolves the ticket. Status changes to `Resolved`.
4. **`!close`** — Admin force-closes the ticket. All members are kicked from the group and the
   bot leaves.

### Ticket statuses

| Status | Description |
| ------ | ----------- |
| `Open` | Newly created, waiting for staff |
| `Claimed` | Staff has taken ownership |
| `Resolved` | Issue resolved by staff |
| `Closed` | Force-closed by admin |

### `data/tickets.json` structure

```json
{
  "id": "TK-001",
  "creatorId": "6281234567890@c.us",
  "category": "general",
  "status": "Open",
  "assignedStaff": null,
  "chatId": null,
  "inviteLink": null,
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000,
  "closedAt": null
}
```

---

## 👥 Staff Management

Owner-managed staff roster stored in `data/staff.json`. Staff can use ticket commands
(`!claim`, `!resolve`, `!tickets`).

### `data/staff.json` structure

```json
[
  {
    "phone": "6281234567890",
    "name": "Yoga",
    "authorId": "203238137704471@lid"
  }
]
```

---

## 📢 Anti-Advertisement Module

See [original documentation](#-anti-advertisement-module) above.

## 🚨 Anti-Raid Module

See [original documentation](#-anti-raid-module) above.

## 💠 Anti-Sticker Spam Module

See [original documentation](#-anti-sticker-spam-module) above.

---

## 📜 Rule Management

Every rule lives in `data/rules.json`. Moderation commands (`!warn`, `!kick`, `!ban`, `!tempban`)
accept a rule id (e.g. `!ban @user R4`) and auto-load the rule's description as the reason.

---

## 🌐 Web Dashboard

Owner-authenticated Express dashboard. Enable by setting `DASHBOARD_TOKEN` in `.env`.

- **Overview** — uptime, bans, warnings, messages, memory, per-module stats.
- **Modules** — toggle and configure all moderation modules.
- **Rules** — CRUD operations.
- **Incidents / Bans / Warnings** — read-only activity tables.

---

## 📁 Folder structure

```text
prizmarine-anti-toxic/
├── src/
│   ├── index.js            # Bootstrap, client, QR, reconnect
│   ├── config/             # env loading + constants
│   ├── handlers/           # WhatsApp event wiring
│   ├── commands/           # One file per command + registry
│   ├── database/           # DatabaseService (lowdb) + repositories
│   ├── services/           # Toxicity, ContextualModerationPipeline,
│   │                       # Moderation, Ticket, Staff, Spam, etc.
│   ├── web/                # Express dashboard
│   ├── utils/              # sanitize, time, mentions, formatter
│   └── events/             # EventBus
├── data/                   # JSON data files + backups/
├── public/                 # Dashboard static UI
├── logs/                   # Winston output
├── .wwebjs_auth/           # Cached WhatsApp session
├── .env                    # Configuration
└── package.json
```

---

## 🩺 Health, backup & recovery

- **Backups:** every 12h JSON files are copied to `data/backups/` (14 most recent kept).
- **Health:** heartbeat logged every 5 minutes.
- **Reconnect:** auto-reconnects on transient disconnect.
- **Graceful shutdown:** SIGINT/SIGTERM stops cleanly.

---

## ⚠️ Disclaimer

This tool is intended for groups you own or administer. Automating a WhatsApp account may violate
WhatsApp's Terms of Service; use it responsibly and at your own risk.

---

## Contributors

Special thanks:

- **@Yoga** — Reported initial false positive detection issue in v1.1.0
- **@Altan** — QA testing and discovered additional context detection issues for v1.1.1
