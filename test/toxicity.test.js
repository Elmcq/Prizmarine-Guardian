import test from 'node:test';
import assert from 'node:assert/strict';
import { ToxicityService } from '../src/services/ToxicityService.js';
import { sanitize } from '../src/utils/sanitize.js';

const service = new ToxicityService({
 getAll() {
 return {
 indonesian: ['bangsat'],
 english: ['fuck'],
 slurs: [],
 hateSpeech: [],
 harassment: [],
 spamInsults: [],
 patterns: [],
 };
 },
});

test('sanitize normalizes case and WhatsApp formatting', () => {
 assert.equal(sanitize('*_~Fuck~_*'), 'fuck');
});

for (const text of ['Fuck', 'fuck', 'FUCK', 'fUcK']) {
 test(`detects case-insensitive English word: ${text}`, () => {
 const result = service.detect(text);
 assert.equal(result.isToxic, true);
 assert.equal(result.category, 'english');
 assert.equal(result.keyword, 'fuck');
 assert.equal(result.sanitized, 'fuck');
 });
}

test('detects toxic words inside normal sentences', () => {
 assert.equal(service.detect('What the Fuck is this?').isToxic, true);
});

test('word boundaries minimize false positives', () => {
 assert.equal(service.detect('firetruck').isToxic, false);
});

test('normal messages pass', () => {
 const result = service.detect('hello friend');
 assert.equal(result.isToxic, false);
 assert.equal(result.category, null);
 assert.equal(result.keyword, null);
});

test('all array categories are loaded dynamically', () => {
 const dynamic = new ToxicityService({ getAll: () => ({ customCategory: ['blockedword'], patterns: [] }) });
 assert.equal(dynamic.detect('BLOCKEDWORD').category, 'customCategory');
});
