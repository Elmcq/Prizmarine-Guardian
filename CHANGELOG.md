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

## v1.1.1

**Contextual Moderation Pipeline — QA improvements**

### Fixed
- False positive: `"tidak goblok"` triggering warning (negation detection missed due to word-boundary issue)
- False positive: `"dasar goblok"` incorrectly classified as MUTE (severity 4 + no target context)
- Target detection: `"lo"` pronoun matching inside `"goblok"` substring — now uses word boundaries

### Added
- Context patterns: `quotation` (quoted text detection), `discussion` (word-discussion patterns), `entityProtection` (presiden/pejabat/tokoh)
- Scoring adjustments: quotation (-6), discussion (-5), explaining (-4), criticism (-3)
- 8 regression tests for context/negation/education scenarios

### Changed
- `data/badwords.json` — expanded contextPatterns: `quotation`, `discussion`, `criticism`, `entityProtection`
- `ContextualModerationPipeline.js` — Stage 3: quotation/discussion/criticism/entityProtection detection; Stage 6: adjusted scoring weights; target detection uses word boundaries
- `test/toxicity.test.js` — expanded from 23 to 31 tests

---

Special thanks:
**@Yoga** — reported false positive detection issue
**@Altan** — QA testing for v1.1.1
