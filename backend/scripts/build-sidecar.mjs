import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const arch = os.arch();
const archMap = {
  arm64: {
    target: 'node18-macos-arm64',
    triple: 'aarch64-apple-darwin'
  },
  x64: {
    target: 'node18-macos-x64',
    triple: 'x86_64-apple-darwin'
  }
};

if (!archMap[arch]) {
  console.error(`Arquitetura nao suportada para build sidecar: ${arch}`);
  process.exit(1);
}

const outDir = path.resolve(import.meta.dirname, '../../src-tauri/binaries');
await mkdir(outDir, { recursive: true });

const outFile = path.join(outDir, `forex-backend-${archMap[arch].triple}`);
const entry = path.resolve(import.meta.dirname, '../src/server.js');

console.log(`Gerando sidecar ${outFile}...`);
execSync(`npx pkg ${entry} --targets ${archMap[arch].target} --output ${outFile}`, {
  stdio: 'inherit'
});
