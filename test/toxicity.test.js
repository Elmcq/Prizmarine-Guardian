import test from 'node:test';
import assert from 'node:assert/strict';
import { ToxicityService } from '../src/services/ToxicityService.js';
import { BadwordRepository } from '../src/database/repositories/BadwordRepository.js';
import { sanitize } from '../src/utils/sanitize.js';

const repository = {
 isEnabled: () => true,
 getStats: () => ({ detections: 0, warnings: 0, mostTriggeredCategory: null, keywords: 3 }),
 getAll: () => ({
  indonesian: ['anjing'],
  english: ['fuck', 'dick'],
  slurs: [],
  hateSpeech: [],
  harassment: [],
  spamInsults: [],
  patterns: [],
  severity: { anjing: 7, fuck: 8, dick: 6 },
  config: { toxicThreshold: 3, cooldownDurationMs: 15000, negationWindow: 3, targetRequired: false },
  negations: ['bukan', 'tidak', 'tak', 'jangan'],
  contextPatterns: { quoting: ['kata'], explaining: ['adalah'] },
  targetPronouns: ['kamu', 'lu', 'dia'],
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
 assert.equal(repo.getSettings().keywords, 2);
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
 assert.equal(settings.keywords, 3);
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
