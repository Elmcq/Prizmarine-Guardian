# Changelog

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
