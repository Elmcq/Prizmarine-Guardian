export class BadwordRepository {
 constructor(dbService) {
 this.dbService = dbService;
 this.db = dbService.badwords;
 }

 async reload() {
 await this.dbService.badwords.read();
 return this.getAll();
 }

 getAll() {
 const data = this.db.data;
 if (!data || typeof data !== 'object' || Array.isArray(data)) return { patterns: [] };
 const categories = {};
 for (const [name, entries] of Object.entries(data)) {
 if (!Array.isArray(entries)) continue;
 categories[name] = entries.filter((entry) => typeof entry === 'string' && entry.trim());
 }
 if (!categories.patterns) categories.patterns = [];
 return categories;
 }
}

export default BadwordRepository;
