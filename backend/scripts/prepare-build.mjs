import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve(import.meta.dirname, '../dist');
await mkdir(distDir, { recursive: true });
console.log('Backend pronto para sidecar. Sem etapa de compilacao adicional.');
