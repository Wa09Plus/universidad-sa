// src/core/secure-logger.js - Módulo de Registro Seguro (Secure Logging)
// Demostración comparativa de Registro Inseguro vs. Registro Seguro para auditoría
import db from '../../database/connection.js';

// Lista de campos sensibles que NUNCA deben registrarse en texto claro (CWE-532)
const CAMPOS_SENSIBLES = ['pass', 'password', 'token', 'secret', 'authorization', 'DPI', 'dpi'];

/**
 * ❌ EJEMPLO DE REGISTRO INSEGURO (VULNERABLE)
 * Loguea datos confidenciales directamente en la consola/archivos de texto.
 */
export function logInseguro(origen, datos) {
  console.log(`[INSECURE LOG - ${origen}] Payload completo:`, JSON.stringify(datos));
}

/**
 * Sanitiza recursivamente cualquier objeto o array enmascarando información confidencial.
 */
function sanitizarDatos(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizarDatos);
  }

  const limpio = {};
  for (const [clave, valor] of Object.entries(obj)) {
    const claveLower = clave.toLowerCase();
    const esSensible = CAMPOS_SENSIBLES.some((s) => claveLower.includes(s.toLowerCase()));

    if (esSensible) {
      limpio[clave] = '***[REDACTED]***';
    } else if (typeof valor === 'object') {
      limpio[clave] = sanitizarDatos(valor);
    } else {
      limpio[clave] = valor;
    }
  }
  return limpio;
}

/**
 * ✅ EJEMPLO DE REGISTRO SEGURO (CORREGIDO)
 * Registra eventos con fecha ISO, nivel de severidad, trazabilidad y redacción de datos sensibles.
 */
export function secureLog({ nivel = 'INFO', evento, usuario = 'ANONIMO', ip = '127.0.0.1', metadata = {} }) {
  const timestamp = new Date().toISOString();
  const datosSanitizados = sanitizarDatos(metadata);

  // 1. Salida segura formateada por consola (sin secretos)
  const mensaje = `[${timestamp}] [${nivel.toUpperCase()}] [USER:${usuario}] [IP:${ip}] EVENT:${evento} - DATA:${JSON.stringify(datosSanitizados)}`;

  if (nivel === 'ERROR') {
    console.error(mensaje);
  } else if (nivel === 'WARN') {
    console.warn(mensaje);
  } else {
    console.log(mensaje);
  }

  // 2. Persistencia en la tabla de bitácora (si la tabla existe)
  try {
    db.prepare(`
      INSERT INTO tbl_bitacora (fecha_hora, nivel, evento, usuario, ip, detalles)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(timestamp, nivel, evento, usuario, ip, JSON.stringify(datosSanitizados));
  } catch (err) {
    // Si la tabla no existe en la fase insegura, continúa sin romper la ejecución
  }
}

