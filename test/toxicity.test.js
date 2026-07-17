import test from 'node:test';
import assert from 'node:assert/strict';
import { ToxicityService } from '../src/services/ToxicityService.js';
import { BadwordRepository } from '../src/database/repositories/BadwordRepository.js';
import { sanitize } from '../src/utils/sanitize.js';

const repository = {
 isEnabled: () => true,
 getStats: () => ({ detections: 0, warnings: 0, mostTriggeredCategory: null, keywords: 3 }),
 getAll: () => ({
  indonesian: ['anjing', 'goblok', 'bangsat'],
  english: ['fuck', 'dick'],
  slurs: [],
  hateSpeech: [],
  harassment: [],
  spamInsults: [],
  patterns: [],
  severity: { anjing: 7, goblok: 4, bangsat: 8, fuck: 8, dick: 6 },
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
   targetPronouns: ['kamu', 'lu', 'dia', 'kau'],
 }),
};
const service = new ToxicityService(repository);

test('sanitize normalizes case and WhatsApp formatting', () => {
 assert.equal(sanitize('*_~Fuck~_*'), 'fuck');
});

for (const text of ['Fuck', 'fuck', 'FUCK', 'fUcK']) {
 test(`detects case-insensitive English word: ${text}`, () => {
 const result = service.detect(text);
 assert.equal(result.isToxic, true);
 assert.equal(result.category, 'english');
 assert.equal(result.keyword, 'fuck');
 });
}

test('detects Dick and Indonesian keywords', () => {
 assert.equal(service.detect('Dick').keyword, 'dick');
 assert.equal(service.detect('anjing').category, 'indonesian');
});

test('normal messages pass', () => {
 assert.equal(service.detect('normal text').isToxic, false);
});

test('word boundaries minimize false positives', () => {
 assert.equal(service.detect('firetruck').isToxic, false);
});

test('loads top-level category arrays', () => {
 const db = {
 badwords: { data: { enabled: true, english: ['fuck'], indonesian: ['anjing'], patterns: [] } },
 persist: async () => {},
 uuid: () => 'id',
 };
 const repo = new BadwordRepository(db);
 assert.equal(repo.getSettings().keywords >= 2, true);
});

test('loads wrapped category arrays even when empty defaults exist at root', () => {
 const db = {
  badwords: {
   data: {
    enabled: true,
    english: ['fuck', 'dick'],
    indonesian: ['anjing'],
    patterns: ['bad\\s+phrase'],
    severity: { anjing: 7, fuck: 8, dick: 6 },
    config: { toxicThreshold: 3, cooldownDurationMs: 15000, negationWindow: 3, targetRequired: false },
    negations: ['bukan', 'tidak'],
    contextPatterns: {},
    targetPronouns: ['kamu', 'lu'],
   },
  },
  persist: async () => {},
  uuid: () => 'id',
 };
 const repo = new BadwordRepository(db);
 const settings = repo.getSettings();
 assert.equal(settings.keywords >= 3, true);
 assert.equal(settings.patterns, 1);
 const wrappedService = new ToxicityService(repo);
 assert.equal(wrappedService.detect('Fuck').isToxic, true);
 assert.equal(wrappedService.detect('Dick').isToxic, true);
 assert.equal(wrappedService.detect('anjing').isToxic, true);
});

test('contextual pipeline reduces score for negated words', () => {
 const result = service.detect('tidak anjing');
 assert.equal(result.isToxic, false);
 assert.equal(result.negation, true);
});

test('contextual pipeline reduces score for safe context', () => {
 const result = service.detect('kata anjing termasuk toxic');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('quoting') || result.context.includes('explaining'), true);
});

test('contextual pipeline detects target', () => {
 const result = service.detect('lu anjing');
 assert.equal(result.target, true);
});

test('contextual pipeline returns score and decision', () => {
 const result = service.detect('anjing');
 assert.equal(typeof result.score, 'number');
 assert.equal(typeof result.decision, 'string');
});

// === v1.1.1 Regression Tests ===

test('IGNORE: discussion context — discussing the word itself', () => {
 const result = service.detect('kata goblok termasuk kata kasar');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('discussion'), true);
});

test('IGNORE: negated insult', () => {
 const result = service.detect('tidak goblok');
 assert.equal(result.isToxic, false);
 assert.equal(result.negation, true);
});

test('IGNORE: quotation context', () => {
 const result = service.detect('dia bilang "goblok" tadi');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('quoting'), true);
});

test('IGNORE: entity protection with criticism', () => {
 const result = service.detect('kritik pejabat soal goblok');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('criticism') || result.context.includes('entityProtection'), true);
});

test('IGNORE: educational context', () => {
 const result = service.detect('jangan gunakan kata goblok');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('discussion') || result.context.includes('warning'), true);
});

test('WARNING: direct personal attack', () => {
 const result = service.detect('dasar goblok');
 assert.equal(result.isToxic, true);
});

test('WARNING: direct insult with target', () => {
 const result = service.detect('lu goblok');
 assert.equal(result.isToxic, true);
 assert.equal(result.target, true);
});

test('WARNING: severe insult', () => {
 const result = service.detect('bangsat');
 assert.equal(result.isToxic, true);
});

// === v1.1.2 Regression Tests: Literal Context ===

test('IGNORE: literal context — animal discussion', () => {
 const result = service.detect('Anjing hewan lucu');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('literal'), true);
});

test('IGNORE: literal context — pet discussion', () => {
 const result = service.detect('Saya suka anjing peliharaan');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('literal'), true);
});

test('IGNORE: literal context — educational', () => {
 const result = service.detect('Anjing adalah hewan mamalia');
 assert.equal(result.isToxic, false);
 assert.equal(result.context.includes('literal'), true);
});

test('WARNING: direct insult — no literal context', () => {
 const result = service.detect('dasar anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.context.includes('literal'), false);
});

test('WARNING: insult with target — no literal context', () => {
 const result = service.detect('Anjing kamu');
 assert.equal(result.isToxic, true);
 assert.equal(result.target, true);
 assert.equal(result.context.includes('literal'), false);
});

test('WARNING: insult with target — no literal context (variant)', () => {
 const result = service.detect('Dasar kau anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.target, true);
});
