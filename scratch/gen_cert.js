// scratch/gen_cert.js
import crypto from 'node:crypto';
import tls from 'node:tls';

// Generate 2048-bit RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

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

// OIDs
const OID_sha256WithRSA = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]);
const OID_commonName = Buffer.from([0x55, 0x04, 0x03]);

const sigAlg = sequence(tag(0x06, OID_sha256WithRSA), tag(0x05)); // NULL params

// Serial number: 1
const serial = tag(0x02, Buffer.from([0x01]));

// Name: CN=localhost
const name = sequence(
  tag(0x31, sequence(tag(0x06, OID_commonName), tag(0x0c, Buffer.from('localhost'))))
);

// Validity: 2026 to 2030 (UTCTime)
const validity = sequence(
  tag(0x17, Buffer.from('260101000000Z')),
  tag(0x17, Buffer.from('300101000000Z'))
);

// TBS Certificate
const tbs = sequence(
  tag(0xa0, tag(0x02, Buffer.from([0x02]))), // version 3 (v=2)
  serial,
  sigAlg,
  name, // issuer
  validity,
  name, // subject
  publicKey // SubjectPublicKeyInfo
);

// Sign TBS with private key
const signer = crypto.createSign('SHA256');
signer.update(tbs);
const signature = signer.sign(privateKey);

// Bit string for signature (starts with 0 unused bits)
const sigBitString = tag(0x03, Buffer.from([0x00]), signature);

// Full X.509 cert DER
const certDer = sequence(tbs, sigAlg, sigBitString);

const certPem = `-----BEGIN CERTIFICATE-----\n${certDer.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;

console.log('Validating with tls.createSecureContext...');
const ctx = tls.createSecureContext({
  key: privateKey,
  cert: certPem
});
console.log('SecureContext successfully created!');
console.log(certPem);

