// src/core/secure-logger.js
// Implementación de Secure Logging (Fase II.E de la Tarea Integradora)
// Cumple con el principio de registrar eventos de seguridad SIN exponer datos sensibles.
import db from '../../database/connection.js';

// Asegurar que la tabla exista al importar
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

const stmtInsert = db.prepare(`
  INSERT INTO tbl_bitacora (usuario, ip, accion, modulo, resultado, detalles)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Lista negra de campos sensibles que JAMÁS deben aparecer en logs
const CAMPOS_SENSIBLES = ['pass', 'password', 'clave', 'token', 'secret', 'authorization', 'dpi', 'tarjeta'];

/**
 * Filtra y redacta recursivamente objetos antes de guardarlos en la bitácora
 */
function sanitizarObjeto(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizarObjeto);

  const limpio = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    if (CAMPOS_SENSIBLES.some((campo) => keyLower.includes(campo))) {
      limpio[k] = '[REDACTADO_POR_SEGURIDAD]';
    } else if (typeof v === 'object' && v !== null) {
      limpio[k] = sanitizarObjeto(v);
    } else {
      limpio[k] = v;
    }
  }
  return limpio;
}

/**
 * Registra un evento de auditoría en la tabla tbl_bitacora
 */
export function registrarBitacora({
  usuario = 'anonimo',
  ip = '127.0.0.1',
  accion = 'ACCESO',
  modulo = 'SISTEMA',
  resultado = 'EXITO',
  detalles = ''
}) {
  try {
    let detallesFinal = '';
    if (typeof detalles === 'object') {
      detallesFinal = JSON.stringify(sanitizarObjeto(detalles));
    } else {
      let str = String(detalles || '');
      str = str.replace(/(pass|password|clave)=['"][^'"]+['"]/gi, '$1="[REDACTADO]"');
      detallesFinal = str;
    }

    stmtInsert.run(
      String(usuario || 'anonimo').slice(0, 50),
      String(ip || '127.0.0.1').slice(0, 45),
      String(accion).toUpperCase().slice(0, 50),
      String(modulo).toUpperCase().slice(0, 30),
      String(resultado).toUpperCase().slice(0, 20),
      detallesFinal.slice(0, 1000)
    );
  } catch (err) {
    console.error('[SECURE LOGGER ERROR] No se pudo escribir en tbl_bitacora:', err.message);
  }
}
