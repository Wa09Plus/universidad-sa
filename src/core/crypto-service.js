// src/core/crypto-service.js
// Servicios Criptográficos Centralizados:
// 1. Password Hashing con KDF scrypt (Sal criptográfica de 128 bits, N=16384, r=8, p=1).
// 2. Cifrado autenticado en reposo para datos sensibles (DPI) con AES-256-GCM.
import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

// Clave simétrica de 256 bits cargada desde variable de entorno protegida
const ENCRYPTION_KEY_HEX = process.env.DATA_ENCRYPTION_KEY;
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

/**
 * ============================================================================
 * FASE II.A: Almacenamiento Seguro de Contraseñas (KDF con Sal)
 * ============================================================================
 * Por qué SHA-256 simple no es adecuado para contraseñas:
 * - SHA-256 es una función hash de propósito general diseñada para ser rápida en hardware.
 * - Un atacante con GPUs modernas puede computar miles de millones de hashes SHA-256 por segundo.
 * - Sin sal (salt), es vulnerable a tablas arcoíris (Rainbow Tables) precomputadas.
 * - scrypt es una función de derivación de claves (KDF) con costo intensivo en memoria y CPU,
 *   lo que vuelve los ataques de fuerza bruta económicamente inviables.
 */
export function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('La contraseña debe ser una cadena de texto válida');
  }
  // Sal criptográfica única de 16 bytes (128 bits) generada por CSPRNG
  const salt = crypto.randomBytes(16);
  // Parámetros de costo recomendados por OWASP para scrypt: N=16384, r=8, p=1, longitud 64 bytes
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;

  // Compatibilidad hacia atrás: si la contraseña en BD es texto plano (usuarios semilla iniciales)
  if (!storedHash.startsWith('scrypt:')) {
    return plainPassword === storedHash;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = Buffer.from(parts[1], 'hex');
  const expectedKey = Buffer.from(parts[2], 'hex');

  // Derivamos la clave con la misma sal almacenada
  const actualKey = crypto.scryptSync(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 });

  // Comparación en tiempo constante para mitigar ataques de temporización (Timing Attacks)
  return crypto.timingSafeEqual(expectedKey, actualKey);
}

/**
 * ============================================================================
 * FASE II.B: Protección Criptográfica de Información Sensible en Reposo (DPI)
 * ============================================================================
 * Algoritmo: AES-256-GCM (Galois/Counter Mode)
 * - Provee confidencialidad (cifrado AES de 256 bits).
 * - Provee autenticidad e integridad mediante un Authentication Tag de 128 bits.
 * - Utiliza un Vector de Inicialización (IV) único de 96 bits (12 bytes) por cada registro.
 */
export function cifrarDPI(dpiPlano) {
  if (!dpiPlano) return '';
  const dpiStr = String(dpiPlano).trim();

  // Vector de inicialización (IV) único de 12 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(dpiStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Formato de almacenamiento seguro: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function descifrarDPI(dpiCifrado) {
  if (!dpiCifrado) return '';
  const parts = dpiCifrado.split(':');
  if (parts.length !== 3) {
    return dpiCifrado;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CRYPTO ERROR] Falla de autenticidad/descifrado de DPI:', err.message);
    return 'DPI_ERROR_INTEGRIDAD';
  }
}

/**
 * Enmascara el DPI para visualización segura (ej. *********0101)
 */
export function enmascararDPI(dpi) {
  const limpio = String(dpi || '').replace(/\D/g, '');
  if (limpio.length < 4) return '***';
  return '*'.repeat(limpio.length - 4) + limpio.slice(-4);
}

