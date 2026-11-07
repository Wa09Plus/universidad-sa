// scratch/check_git_status.js
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function readObject(hash) {
  const p = path.join('.git/objects', hash.slice(0, 2), hash.slice(2));
  if (!fs.existsSync(p)) return null;
  const buf = fs.readFileSync(p);
  const decompressed = zlib.inflateSync(buf);
  const nullIdx = decompressed.indexOf(0);
  const header = decompressed.subarray(0, nullIdx).toString();
  const content = decompressed.subarray(nullIdx + 1);
  return { header, content };
}

function parseTree(hash, prefix = '') {
  const obj = readObject(hash);
  if (!obj) return [];
  const entries = [];
  let i = 0;
  const buf = obj.content;
  while (i < buf.length) {
    const spaceIdx = buf.indexOf(32, i);
    const mode = buf.subarray(i, spaceIdx).toString();
    const nullIdx = buf.indexOf(0, spaceIdx);
    const name = buf.subarray(spaceIdx + 1, nullIdx).toString();
    const sha = buf.subarray(nullIdx + 1, nullIdx + 21).toString('hex');
    i = nullIdx + 21;
    const fullPath = prefix ? prefix + '/' + name : name;
    if (mode === '40000') {
      entries.push(...parseTree(sha, fullPath));
    } else {
      entries.push({ path: fullPath, sha });
    }
  }
  return entries;
}

const headCommitHash = fs.readFileSync('.git/refs/heads/implementaciones_seguras', 'utf8').trim();
console.log('Rama actual: implementaciones_seguras');
console.log('Commit HEAD:', headCommitHash);

const commitObj = readObject(headCommitHash);
const treeMatch = commitObj.content.toString().match(/tree ([0-9a-f]{40})/);
const treeSha = treeMatch[1];
console.log('Tree SHA:', treeSha);

const commitMsgMatch = commitObj.content.toString().split('\n\n')[1]?.trim();
console.log('Mensaje del commit:', commitMsgMatch);

const treeEntries = parseTree(treeSha);
console.log(`Total de archivos trackeados en el commit: ${treeEntries.length}`);

const modified = [];
for (const entry of treeEntries) {
  if (fs.existsSync(entry.path)) {
    const content = fs.readFileSync(entry.path);
    // Git uses CRLF or LF depending on git config.
    const h = crypto.createHash('sha1').update('blob ' + content.length + '\0').update(content).digest('hex');
    // Also test LF normalized
    const contentLF = Buffer.from(content.toString().replace(/\r\n/g, '\n'));
    const hLF = crypto.createHash('sha1').update('blob ' + contentLF.length + '\0').update(contentLF).digest('hex');
    if (h !== entry.sha && hLF !== entry.sha) {
      modified.push(entry.path);
    }
  } else {
    modified.push('ELIMINADO: ' + entry.path);
  }
}

console.log('\nArchivos modificados en el directorio de trabajo respecto al commit:');
if (modified.length === 0) {
  console.log('-> Ninguno. El directorio de trabajo coincide exactamente con el commit.');
} else {
  modified.forEach(f => console.log('  *', f));
}

// Check untracked files
function getFiles(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.git' || f === 'dist' || f === 'database' || f === 'scratch') continue;
    const full = path.join(dir, f).replace(/\\/g, '/');
    if (fs.statSync(full).isDirectory()) {
      getFiles(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

const allWorkingFiles = getFiles('.');
const trackedSet = new Set(treeEntries.map(e => e.path));
const untracked = allWorkingFiles.filter(f => !trackedSet.has(f) && !trackedSet.has(f.replace(/^\.\//, '')));

console.log('\nArchivos nuevos no trackeados (Untracked):');
if (untracked.length === 0) {
  console.log('-> Ninguno.');
} else {
  untracked.forEach(f => console.log('  +', f));
}

