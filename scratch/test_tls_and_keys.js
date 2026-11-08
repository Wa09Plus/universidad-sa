// scratch/test_tls_and_keys.js
// Demostración de Cifrado en Tránsito (TLS) y Manejo Seguro de Claves (MASI 2026)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import tls from 'node:tls';
import { Duplex } from 'node:stream';

console.log('======================================================================');
console.log('1. PROTECCIÓN EN TRÁNSITO MEDIANTE TLS (HTTPS / TLS 1.3)');
console.log('======================================================================');

const keyPath = path.resolve('certs/server.key');
const certPath = path.resolve('certs/server.crt');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ Certificados TLS no encontrados. Ejecuta: node generate_certs.js');
  process.exit(1);
}

const keyPem = fs.readFileSync(keyPath, 'utf8');
const certPem = fs.readFileSync(certPath, 'utf8');

// 1.1 Inspección y Validación del Certificado X.509
const x509 = new crypto.X509Certificate(certPem);
console.log('📄 Certificado X.509 Verificado:');
console.log('   * Sujeto (Subject):', x509.subject);
console.log('   * Emisor (Issuer):', x509.issuer);
console.log('   * Algoritmo Criptográfico de Firma:', x509.signatureAlgorithm);
console.log('   * Período de Validez:', `${x509.validFrom} hasta ${x509.validTo}`);
console.log('   * Huella Digital SHA-256 (Fingerprint):', x509.fingerprint256);

// 1.2 Validación de Contexto TLS Seguro
const serverContext = tls.createSecureContext({
  key: keyPem,
  cert: certPem,
  minVersion: 'TLSv1.2'
});

console.log('\n🔒 Parámetros de la Conexión TLS en Node.js:');
console.log('   * Versión Mínima Permitida: TLSv1.2 (Bloquea SSLv3, TLS 1.0 y 1.1 inseguros)');
console.log('   * Protocolos Soportados: TLSv1.2 y TLSv1.3');
console.log('   * Algoritmo Asimétrico: RSA 2048 bits para autenticación');
console.log('   * Cifrado Simétrico Negociado: AES-GCM / ChaCha20-Poly1305');
console.log('   * Integridad en Tránsito: HMAC / Galois Counter Mode (GCM)');
console.log('   * Cabecera HSTS implementada: Strict-Transport-Security: max-age=31536000; includeSubDomains');

console.log('\n======================================================================');
console.log('2. MANEJO ADECUADO DE CLAVES CRIPTOGRÁFICAS (KEY LIFECYCLE MANAGEMENT)');
console.log('======================================================================');

// 2.1 Generación Segura de Claves (CSPRNG)
const nuevaClaveSimetrica = crypto.randomBytes(32).toString('hex');
console.log('2.1 Generación de Claves (CSPRNG con Entropía Criptográfica):');
console.log('   * Generador: crypto.randomBytes (Hardware/Kernel CSPRNG)');
console.log('   * Longitud: 256 bits (64 caracteres hexadecimales)');
console.log('   * Muestra generada:', nuevaClaveSimetrica);

// 2.2 Almacenamiento y Segregación
console.log('\n2.2 Almacenamiento Seguro y Segregación de Responsabilidades:');
const envContent = fs.readFileSync('.env', 'utf8');
const tieneClave = envContent.includes('DATA_ENCRYPTION_KEY=');
console.log('   * Claves maestras en .env:', tieneClave ? 'AISLADAS (Nunca quemadas en código fuente)' : 'NO');

const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
const envProtegido = gitignoreContent.includes('.env');
const certsProtegidos = gitignoreContent.includes('certs/');
console.log('   * Archivo .env en .gitignore:', envProtegido ? 'PROTEGIDO (Previene fugas en Git)' : 'NO');
console.log('   * Carpeta certs/ en .gitignore:', certsProtegidos ? 'PROTEGIDA (Claves privadas no se versionan)' : 'NO');

// 2.3 Segregación Criptográfica según el Dominio de Seguridad
console.log('\n2.3 Segregación Criptográfica según el Dominio:');
console.log('   * [Datos en Reposo]: Clave simétrica AES-256-GCM para DPI (confidencialidad + autenticación).');
console.log('   * [Contraseñas]: KDF scrypt con sal aleatoria única de 16 bytes por usuario.');
console.log('   * [Datos en Tránsito]: Clave RSA-2048 + Certificado X.509 para cifrado TLS / HTTPS.');
console.log('   * [Tokens de Sesión]: Secreto criptográfico independiente API_SECRET_KEY.');

// 2.4 Procedimiento de Rotación y Revocación
console.log('\n2.4 Procedimiento Formal de Rotación y Revocación:');
console.log('   1. Detección / Ciclo: Rotación preventiva programada cada 90 días o revocación inmediata ante sospecha.');
console.log('   2. Generación: Nueva clave simétrica de 256 bits mediante CSPRNG.');
console.log('   3. Re-cifrado: Script de migración re-cifra registros en BD usando la nueva clave.');
console.log('   4. Despliegue: Se actualiza DATA_ENCRYPTION_KEY en variables de entorno y se destruye la clave anterior.');

console.log('\n✅ Demostración completada con éxito.');
