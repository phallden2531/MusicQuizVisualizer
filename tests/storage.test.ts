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
  expect((await reopened.readAsset('test-asset'))?.toString()).toBe('abc');
  expect((await reopened.getAssetInfo('test-asset'))?.contentType).toBe('image/png');
  expect(await reopened.readAsset('../state')).toBeNull();
  expect(await reopened.getAssetInfo('../state')).toBeNull();
});
it('reads byte ranges and deletes media', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'quiz-store-'));
  dirs.push(dir);
  const store = new LocalStorage(dir);
  await store.putAsset(
    { id: 'clip', kind: 'audio', contentType: 'audio/mpeg', size: 10 },
    Buffer.from('0123456789'),
  );
  expect((await store.readAsset('clip', { start: 2, end: 5 }))?.toString()).toBe('2345');
  await store.deleteAsset('clip');
  expect(await store.readAsset('clip')).toBeNull();
  expect(await store.getAssetInfo('clip')).toBeNull();
});
