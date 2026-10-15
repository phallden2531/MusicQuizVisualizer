import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'off-the-record-e2e-'));
process.env.DATA_DIR = directory;
process.on('exit', () => rmSync(directory, { recursive: true, force: true }));
await import('../server/index.ts');
