# Changelog

## v1.1.0

**Contextual Moderation Pipeline** — false positive reduction

### Added
- Context-aware toxic detection (7-stage pipeline)
- Negation detection (`tidak`, `bukan`, `jangan`, `ga`, etc.)
- Target detection (`@mention`, pronouns, reply, direct address)
- Per-keyword severity scoring (configurable 0–10)
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

Special thanks:
**@Yoga** — reported false positive detection issue
