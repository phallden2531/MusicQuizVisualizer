import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorage } from '../server/storage';

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
  dirs.length = 0;
});
it('atomically persists versioned state and media across adapter instances', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'quiz-store-'));
  dirs.push(dir);
  const store = new LocalStorage(dir);
  const first = await store.readState();
  expect(first).toBeNull();
  const state = {
    schemaVersion: 1 as const,
    revision: 1,
    quiz: { title: 'Quiz', songs: [], colleagues: [] },
    game: null,
  };
  await store.writeState(state);
  await store.putAsset(
    { id: 'test-asset', kind: 'image', contentType: 'image/png', size: 3 },
    Buffer.from('abc'),
  );
  const reopened = new LocalStorage(dir);
  expect(await reopened.readState()).toEqual(state);
  expect((await reopened.getAsset('test-asset'))?.data.toString()).toBe('abc');
  expect(await reopened.getAsset('../state')).toBeNull();
});
