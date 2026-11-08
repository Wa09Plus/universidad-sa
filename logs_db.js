// logs_db.js
// Inicialización y consulta de la tabla de bitácora (Secure Logging - Fase II.E)
import db from './database/connection.js';

console.log('[INFO] Configurando tabla de bitácora de auditoría segura en SQLite...');

db.exec(`
  CREATE TABLE IF NOT EXISTS tbl_bitacora (
    id_log INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT NOT NULL,
    ip TEXT NOT NULL,
    accion TEXT NOT NULL,
    modulo TEXT NOT NULL,
    resultado TEXT NOT NULL,
    detalles TEXT NOT NULL
  );
`);

console.log('[OK] Tabla tbl_bitacora verificada y lista.');

// Consulta rápida de los últimos registros
const ultimos = db.prepare('SELECT * FROM tbl_bitacora ORDER BY id_log DESC LIMIT 5').all();
console.log(`[INFO] Total de eventos registrados actualmente: ${ultimos.length}`);
if (ultimos.length > 0) {
  console.table(ultimos);
}

