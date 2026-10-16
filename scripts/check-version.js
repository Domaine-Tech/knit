// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getCargoWorkspaceVersion() {
  const content = fs.readFileSync(path.join(rootDir, 'Cargo.toml'), 'utf8');
  const match = content.match(/\[workspace\.package\][\s\S]*?version\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function getTauriVersion() {
  const content = fs.readFileSync(path.join(rootDir, 'knit-app/src-tauri/tauri.conf.json'), 'utf8');
  return JSON.parse(content).version;
}

function getAppPackageVersion() {
  const content = fs.readFileSync(path.join(rootDir, 'knit-app/package.json'), 'utf8');
  return JSON.parse(content).version;
}

function getRootPackageVersion() {
  const content = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8');
  return JSON.parse(content).version;
}

function getTsVersion() {
  const content = fs.readFileSync(path.join(rootDir, 'knit-app/src/utils/version.ts'), 'utf8');
  const match = content.match(/APP_VERSION\s*=\s*'([^']+)'/);
  return match ? match[1] : null;
}

const versions = {
  'Cargo.toml (workspace)': getCargoWorkspaceVersion(),
  'tauri.conf.json': getTauriVersion(),
  'knit-app/package.json': getAppPackageVersion(),
  'package.json (racine)': getRootPackageVersion(),
  'knit-app/src/utils/version.ts': getTsVersion(),
};

console.log('--- 🧶 Audit d\'alignement des versions Knit ---');
let hasMismatch = false;
const firstVersion = versions['Cargo.toml (workspace)'];

for (const [file, ver] of Object.entries(versions)) {
  const status = ver === firstVersion ? '✅' : '❌';
  console.log(`${status} ${file.padEnd(30)} : ${ver}`);
  if (ver !== firstVersion) {
    hasMismatch = true;
  }
}

if (hasMismatch) {
  console.error('\n❌ ERREUR : Desalignement detecte dans les numeros de version !');
  process.exit(1);
} else {
  console.log(`\n✅ SUCCÈS : 100% des sources sont parfaitement alignees sur la v${firstVersion}\n`);
}
