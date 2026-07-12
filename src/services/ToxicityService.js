import { sanitize, escapeRegex } from '../utils/sanitize.js';

export class ToxicityService {
 constructor(badwordRepo) {
 this.repo = badwordRepo;
 this.words = [];
 this.patterns = [];
 this.reload();
 }

 reload() {
 const data = this.repo.getAll();
 const seen = new Set();
 this.words = [];

 for (const [category, entries] of Object.entries(data)) {
 if (category === 'patterns' || !Array.isArray(entries)) continue;
 for (const raw of entries) {
 const normalized = sanitize(raw);
 if (!normalized) continue;
 const key = `${category}${normalized}`;
 if (seen.has(key)) continue;
 seen.add(key);
 this.words.push({
 category,
 raw,
 normalized,
 regex: new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized)}(?=[^a-z0-9]|$)`, 'i'),
 });
 }
 }

 this.patterns = [];
 for (const source of data.patterns || []) {
 if (typeof source !== 'string' || !source.trim()) continue;
 try {
 this.patterns.push({ source, regex: new RegExp(source, 'i') });
 } catch {
 }
 }
 }

 detect(text) {
 if (typeof text !== 'string' || !text) {
 return { isToxic: false, matched: [], category: null, keyword: null, sanitized: '' };
 }

 const sanitized = sanitize(text);
 if (!sanitized) {
 return { isToxic: false, matched: [], category: null, keyword: null, sanitized };
 }

 const matches = [];
 let category = null;
 let keyword = null;

 for (const entry of this.words) {
 if (!entry.regex.test(sanitized)) continue;
 matches.push(entry.raw);
 if (!category) {
 category = entry.category;
 keyword = entry.raw;
 }
 }

 for (const entry of this.patterns) {
 entry.regex.lastIndex = 0;
 if (!entry.regex.test(sanitized)) continue;
 matches.push(entry.source);
 if (!category) {
 category = 'patterns';
 keyword = entry.source;
 }
 }

 const matched = [...new Set(matches)];
 return {
 isToxic: matched.length > 0,
 matched,
 category,
 keyword,
 sanitized,
 };
 }
}

export default ToxicityService;
