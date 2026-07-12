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

test('detects multiple toxic words in a sentence', () => {
 const result = service.detect('Fuck dick');
 assert.equal(result.isToxic, true);
 assert.deepEqual(result.matched, ['fuck', 'dick']);
});

test('detects Indonesian toxic words', () => {
 const result = service.detect('anjing');
 assert.equal(result.isToxic, true);
 assert.equal(result.category, 'indonesian');
});

test('normal messages pass', () => {
 assert.equal(service.detect('normal text').isToxic, false);
});

test('word boundaries minimize false positives', () => {
 assert.equal(service.detect('firetruck').isToxic, false);
});

test('module metadata is excluded from keyword categories', () => {
 const db = {
 badwords: { data: { enabled: true, incidents: [{ category: 'english', action: 'warn' }], english: ['fuck'], patterns: [] } },
 persist: async () => {},
 uuid: () => 'id',
 };
 const repo = new BadwordRepository(db);
 assert.deepEqual(Object.keys(repo.getAll()), ['english', 'patterns']);
 assert.equal(repo.getStats().detections, 1);
 assert.equal(repo.isEnabled(), true);
});
