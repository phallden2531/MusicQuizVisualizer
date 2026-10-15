import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { expect, it } from 'vitest';

it('packages only runtime files even when a previous deployment archive exists', () => {
  mkdirSync('dist/deploy', { recursive: true });
  writeFileSync('dist/deploy/previous.zip', 'previous archive');
  execFileSync('node', ['scripts/package-azure.mjs'], { stdio: 'pipe' });
  rmSync('dist/deploy/previous.zip');
  const files = execFileSync('unzip', ['-Z1', 'dist/deploy/music-quiz.zip'], {
    encoding: 'utf8',
  }).split('\n');
  expect(files).toContain('dist/server.js');
  expect(files).toContain('dist/client/index.html');
  expect(files).toContain('package.json');
  expect(files.some((file) => /(^|\/)(deploy|node_modules|\.data|\.env)(\/|$)/.test(file))).toBe(
    false,
  );
}, 30000);
