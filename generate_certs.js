// generate_certs.js
// Generación Automatizada de Certificados X.509 y Clave Privada para TLS (HTTPS)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

console.log('[INFO] Generando par de claves criptográficas RSA-2048 y certificado X.509 para TLS...');

// 1. Generar par de claves RSA de 2048 bits
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Funciones auxiliares para construcción de estructura ASN.1 DER (X.509 v3)
function encodeLength(len) {
  if (len < 128) return Buffer.from([len]);
  const bytes = [];
  let temp = len;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function tag(t, ...contents) {
  const body = Buffer.concat(contents);
  return Buffer.concat([Buffer.from([t]), encodeLength(body.length), body]);
}

function sequence(...contents) {
  return tag(0x30, ...contents);
}

// OIDs para sha256WithRSAEncryption y Common Name
const OID_sha256WithRSA = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]);
const OID_commonName = Buffer.from([0x55, 0x04, 0x03]);

const sigAlg = sequence(tag(0x06, OID_sha256WithRSA), tag(0x05)); // Parámetros NULL
const serial = tag(0x02, Buffer.from([0x01]));
const name = sequence(tag(0x31, sequence(tag(0x06, OID_commonName), tag(0x0c, Buffer.from('localhost')))));
const validity = sequence(tag(0x17, Buffer.from('260101000000Z')), tag(0x17, Buffer.from('300101000000Z')));

// TBS (To Be Signed) Certificate
const tbs = sequence(
  tag(0xa0, tag(0x02, Buffer.from([0x02]))), // X.509 v3
  serial,
  sigAlg,
  name,
  validity,
  name,
  publicKey
);

// Firma digital con la clave privada usando SHA-256
const signer = crypto.createSign('SHA256');
signer.update(tbs);
const signature = signer.sign(privateKey);
const sigBitString = tag(0x03, Buffer.from([0x00]), signature);

// Estructura X.509 completa en DER y codificación en PEM
const certDer = sequence(tbs, sigAlg, sigBitString);
const certPem = `-----BEGIN CERTIFICATE-----\n${certDer.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;

const certsDir = path.resolve('certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

fs.writeFileSync(path.join(certsDir, 'server.key'), privateKey);
fs.writeFileSync(path.join(certsDir, 'server.crt'), certPem);

console.log('[OK] Certificado TLS y Clave Privada generados exitosamente:');
console.log('   - Certificado X.509: certs/server.crt');
console.log('   - Clave Privada RSA: certs/server.key');

