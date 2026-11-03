// database/connection.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo .sqlite dentro de la carpeta database
const dbPath = path.join(__dirname, 'universidad.sqlite');
const db = new Database(dbPath);

// Activa el cumplimiento estricto de Foreign Keys y modo WAL para concurrencia
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export default db;