import test from 'node:test';
import assert from 'node:assert/strict';
import { ToxicityService } from '../src/services/ToxicityService.js';
import { BadwordRepository } from '../src/database/repositories/BadwordRepository.js';
import { sanitize } from '../src/utils/sanitize.js';

const repository = {
 isEnabled: () => true,
 getStats: () => ({ detections: 0, warnings: 0, mostTriggeredCategory: null, keywords: 3 }),
 getAll: () => ({ indonesian: ['anjing'], english: ['fuck', 'dick'], slurs: [], hateSpeech: [], harassment: [], spamInsults: [], patterns: [] }),
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
 english: [],
 indonesian: [],
 patterns: [],
 badwords: {
 english: ['fuck', 'dick'],
 indonesian: ['anjing'],
 slurs: [],
 hateSpeech: [],
 harassment: [],
 spamInsults: [],
 patterns: ['bad\\s+phrase'],
 },
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
