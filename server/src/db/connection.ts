import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DB_PATH = process.env.DB_PATH
  || path.resolve(__dirname, '../dive2026.db');

let _db: Database.Database | null = null;

function findSchemaPath(): string {
  const candidates = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
    path.resolve(process.cwd(), 'src/db/schema.sql'),
    path.resolve(process.cwd(), 'server/src/db/schema.sql'),
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error('schema.sql not found');
  return found;
}

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: false });
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(fs.readFileSync(findSchemaPath(), 'utf-8'));
  }
  return _db;
}

export function getDbStatus(): {
  path: string;
  data_ready: boolean;
  company_count: number;
  schema_ready: boolean;
} {
  const db = getDb();
  const schemaReady = Boolean(db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='company_master'"
  ).get());
  const companyCount = schemaReady
    ? (db.prepare('SELECT COUNT(*) AS n FROM company_master').get() as { n: number }).n
    : 0;
  return {
    path: DB_PATH,
    data_ready: companyCount > 0,
    company_count: companyCount,
    schema_ready: schemaReady,
  };
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
