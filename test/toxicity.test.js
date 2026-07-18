import test from 'node:test';
import assert from 'node:assert/strict';
import { ToxicityService } from '../src/services/ToxicityService.js';
import { BadwordRepository } from '../src/database/repositories/BadwordRepository.js';
import { sanitize } from '../src/utils/sanitize.js';

const repository = {
 isEnabled: () => true,
 getStats: () => ({ detections: 0, warnings: 0, mostTriggeredCategory: null, keywords: 5 }),
 getAll: () => ({
  normal: ['bego', 'anjay', 'payah'],
  sensitive: ['goblok', 'tolol', 'bacot'],
  high: ['anjing', 'bangsat', 'kontol'],
  slurs: ['nigger', 'faggot'],
  patterns: [],
  severity: {},
  config: { toxicThreshold: 3, cooldownDurationMs: 15000, negationWindow: 3, targetRequired: false },
  negations: ['bukan', 'tidak', 'tak', 'jangan', 'ndak'],
  contextPatterns: {
   quoting: ['kata', 'bilang', 'dia bilang'],
   quotation: ['".*"', "'.*'"],
   explaining: ['adalah', 'termasuk', 'contoh'],
   discussion: ['kata .* termasuk', 'contoh kata', 'arti kata', 'jangan gunakan kata', 'kata kasar'],
   criticism: ['kritik'],
   entityProtection: ['presiden', 'pejabat', 'tokoh'],
   asking: ['kenapa', 'apa'],
   discussing: [],
   warning: ['jangan'],
   educational: ['belajar'],
   literal: ['hewan', 'binatang', 'peliharaan', 'lucu', 'foto', 'jenis', 'ras', 'mamalia', 'suka'],
  },
  targetPronouns: ['kamu', 'lu', 'dia', 'kau', 'dasar'],
 }),
};
const service = new ToxicityService(repository);

test('sanitize normalizes case and WhatsApp formatting', () => {
 assert.equal(sanitize('*_~Fuck~_*'), 'fuck');
});

// === Normal Tier Tests ===

test('normal tier: never triggers — bego', () => {
 const result = service.detect('bego');
 assert.equal(result.isToxic, false);
 assert.equal(result.decision, 'IGNORE');
 assert.equal(result.tier, 'normal');
});

test('normal tier: never triggers — anjay', () => {
 const result = service.detect('anjay');
 assert.equal(result.isToxic, false);
 assert.equal(result.tier, 'normal');
});

test('normal tier: never triggers — payah', () => {
 const result = service.detect('payah');
 assert.equal(result.isToxic, false);
 assert.equal(result.tier, 'normal');
});

// === Sensitive Tier Tests ===

test('sensitive tier: triggers with target — goblok', () => {
 const result = service.detect('lu goblok');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'sensitive');
 assert.equal(result.target, true);
});

test('sensitive tier: negated reduces score — tidak goblok', () => {
 const result = service.detect('tidak goblok');
 assert.equal(result.isToxic, false);
 assert.equal(result.negation, true);
});

test('sensitive tier: quotation context — dia bilang "goblok"', () => {
 const result = service.detect('dia bilang "goblok" tadi');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('quoting'), true);
});

test('sensitive tier: discussion context — kata goblok termasuk kata kasar', () => {
 const result = service.detect('kata goblok termasuk kata kasar');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('discussion'), true);
});

test('sensitive tier: direct insult — dasar goblok', () => {
 const result = service.detect('dasar goblok');
 assert.equal(result.isToxic, true);
});

test('sensitive tier: educational context — jangan gunakan kata goblok', () => {
 const result = service.detect('jangan gunakan kata goblok');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('discussion') || result.context.includes('warning'), true);
});

// === High Tier Tests ===

test('high tier: triggers — anjing', () => {
 const result = service.detect('anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'high');
});

test('high tier: with target — lu anjing', () => {
 const result = service.detect('lu anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.target, true);
});

test('high tier: negated reduces but still warns — tidak anjing', () => {
 const result = service.detect('tidak anjing');
 assert.equal(result.negation, true);
});

test('high tier: literal context reduces — Anjing hewan lucu', () => {
 const result = service.detect('Anjing hewan lucu');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('literal'), true);
});

test('high tier: direct insult — dasar anjing', () => {
 const result = service.detect('dasar anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.context.includes('literal'), false);
});

test('high tier: severe — bangsat', () => {
 const result = service.detect('bangsat');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'high');
});

// === Slurs Tier Tests ===

test('slurs tier: always triggers — nigger', () => {
 const result = service.detect('nigger');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'slurs');
});

test('slurs tier: always triggers — faggot', () => {
 const result = service.detect('faggot');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'slurs');
});

test('slurs tier: with target — lu nigger', () => {
 service.pipeline.cooldowns.clear();
 const result = service.detect('lu nigger');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'slurs');
 assert.equal(result.target, true);
});

// === Backward Compatibility Tests ===

test('detect returns score and decision', () => {
 const result = service.detect('goblok');
 assert.equal(typeof result.score, 'number');
 assert.equal(typeof result.decision, 'string');
});

test('detectSimple works', () => {
 const result = service.detectSimple('goblok');
 assert.equal(result.isToxic, true);
 assert.equal(result.tier, 'sensitive');
});

test('normal messages pass', () => {
 assert.equal(service.detect('normal text').isToxic, false);
});

test('word boundaries minimize false positives', () => {
 assert.equal(service.detect('firetruck').isToxic, false);
});

// === BadwordRepository Tests ===

test('loads tier-based word lists', () => {
 const db = {
  badwords: {
   data: {
    enabled: true,
    tiers: { normal: ['bego'], sensitive: ['goblok'], high: ['anjing'], slurs: ['nigger'] },
    patterns: [],
    config: { toxicThreshold: 3, cooldownDurationMs: 0, negationWindow: 3, targetRequired: false },
    negations: [],
    contextPatterns: {},
    targetPronouns: [],
   },
  },
  persist: async () => {},
  uuid: () => 'id',
 };
 const repo = new BadwordRepository(db);
 const settings = repo.getSettings();
 assert.equal(settings.keywords >= 4, true);
 assert.equal(settings.tiers.normal >= 1, true);
 assert.equal(settings.tiers.sensitive >= 1, true);
});

test('getTierForWord returns correct tier', () => {
 const db = {
  badwords: {
   data: {
    enabled: true,
    tiers: { normal: ['bego'], sensitive: ['goblok'], high: ['anjing'], slurs: ['nigger'] },
    patterns: [],
    config: {},
    negations: [],
    contextPatterns: {},
    targetPronouns: [],
   },
  },
  persist: async () => {},
  uuid: () => 'id',
 };
 const repo = new BadwordRepository(db);
 assert.equal(repo.getTierForWord('bego'), 'normal');
 assert.equal(repo.getTierForWord('goblok'), 'sensitive');
 assert.equal(repo.getTierForWord('anjing'), 'high');
 assert.equal(repo.getTierForWord('nigger'), 'slurs');
 assert.equal(repo.getTierForWord('unknown'), 'sensitive');
});

test('loads empty tiers gracefully', () => {
 const db = {
  badwords: { data: { enabled: true } },
  persist: async () => {},
  uuid: () => 'id',
 };
 const repo = new BadwordRepository(db);
 const settings = repo.getSettings();
 assert.equal(settings.keywords >= 0, true);
 assert.equal(settings.tiers.normal, 0);
});

// === Intent Classification Regression Tests ===

test('GENERAL_EXPRESSION: god damn, again problem', () => {
 const result = service.detect('god damn, again problem');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'GENERAL_EXPRESSION');
});

test('GENERAL_EXPRESSION: damn, the server crashed', () => {
 const result = service.detect('damn, the server crashed');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'GENERAL_EXPRESSION');
});

test('GENERAL_EXPRESSION: what the hell', () => {
 const result = service.detect('what the hell');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'GENERAL_EXPRESSION');
});

test('PERSONAL_ATTACK: directed at someone — lu anjing', () => {
 const result = service.detect('lu anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.intent, 'PERSONAL_ATTACK');
 assert.equal(result.target, true);
});

test('PERSONAL_ATTACK: you are a damn idiot', () => {
 const result = service.detect('lu goblok');
 assert.equal(result.isToxic, true);
 assert.equal(result.intent, 'PERSONAL_ATTACK');
 assert.equal(result.target, true);
});

test('GENERAL_EXPRESSION: omg problem again', () => {
 const result = service.detect('omg problem again');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'GENERAL_EXPRESSION');
});

test('SELF_REFERENCE: i am an idiot', () => {
 const result = service.detect('aku idiot');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'SELF_REFERENCE');
});

test('EDUCATIONAL: kata goblok termasuk kata kasar', () => {
 const result = service.detect('kata goblok termasuk kata kasar');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'EDUCATIONAL');
});

test('QUOTATION: dia bilang "goblok" tadi', () => {
 const result = service.detect('dia bilang "goblok" tadi');
 assert.equal(result.isToxic, false);
 assert.equal(result.intent, 'QUOTATION');
});
