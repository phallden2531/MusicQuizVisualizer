import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
const staging = await mkdtemp(join(tmpdir(), 'music-quiz-deploy-'));
try {
  await mkdir(join(staging, 'dist'), { recursive: true });
  await cp('dist/client', join(staging, 'dist/client'), { recursive: true });
  await cp('dist/server.js', join(staging, 'dist/server.js'));
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  // Azure installs runtime packages; compilation has already happened locally.
  pkg.scripts = { start: 'node dist/server.js' };
  await writeFile(join(staging, 'package.json'), JSON.stringify(pkg, null, 2));
  await cp('package-lock.json', join(staging, 'package-lock.json'));
  await mkdir('dist/deploy', { recursive: true });
  const archive = resolve('dist/deploy/music-quiz.zip');
  await rm(archive, { force: true });
  execFileSync('zip', ['-qr', archive, '.'], { cwd: staging, stdio: 'inherit' });
  console.log(`Azure package: ${archive}`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
