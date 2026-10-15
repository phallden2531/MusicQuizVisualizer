import { beforeEach, expect, it, vi } from 'vitest';
import type { AppState } from '../shared/types';
import { AzureStorage } from '../server/storage';

const remote = vi.hoisted(() => ({
  body: null as Buffer | null,
  version: 0,
  loseResponse: false,
  failBeforeCommit: false,
}));
vi.mock('@azure/storage-blob', async () => {
  const { Readable } = await import('node:stream');
  const failure = (statusCode: number) =>
    Object.assign(new Error(`Storage ${statusCode}`), { statusCode });
  const blob = {
    async download() {
      if (!remote.body) throw failure(404);
      return { etag: `v${remote.version}`, readableStreamBody: Readable.from([remote.body]) };
    },
    async uploadData(
      data: Buffer,
      options: { conditions: { ifMatch?: string; ifNoneMatch?: string } },
    ) {
      if (remote.failBeforeCommit) {
        remote.failBeforeCommit = false;
        throw failure(503);
      }
      if (
        (options.conditions.ifMatch && options.conditions.ifMatch !== `v${remote.version}`) ||
        (options.conditions.ifNoneMatch && remote.body)
      )
        throw failure(412);
      remote.body = Buffer.from(data);
      remote.version++;
      if (remote.loseResponse) {
        remote.loseResponse = false;
        throw new Error('Connection reset after commit');
      }
      return { etag: `v${remote.version}` };
    },
  };
  return {
    BlobServiceClient: class {
      getContainerClient() {
        return { getBlockBlobClient: () => blob };
      }
    },
  };
});
const state = (revision: number): AppState => ({
  schemaVersion: 1,
  revision,
  quiz: { title: 'Quiz', colleagues: [], songs: [] },
  game: null,
});
beforeEach(() => {
  remote.body = null;
  remote.version = 0;
  remote.loseResponse = false;
  remote.failBeforeCommit = false;
});

it('recognizes a committed write after a lost response and allows subsequent writes', async () => {
  const store = new AzureStorage('https://example.blob.core.windows.net');
  await store.readState();
  await store.writeState(state(1));
  remote.loseResponse = true;
  await expect(store.writeState(state(2))).resolves.toBeUndefined();
  await store.writeState(state(3));
  expect(await store.readState()).toEqual(state(3));
});
it('allows retry after a failure that happened before the write committed', async () => {
  const store = new AzureStorage('https://example.blob.core.windows.net');
  await store.readState();
  await store.writeState(state(1));
  remote.failBeforeCommit = true;
  await expect(store.writeState(state(2))).rejects.toThrow();
  await store.writeState(state(2));
  expect(await store.readState()).toEqual(state(2));
});
it('never adopts a conflicting writer ETag and overwrites its different state', async () => {
  const store = new AzureStorage('https://example.blob.core.windows.net');
  await store.readState();
  await store.writeState(state(1));
  remote.body = Buffer.from(JSON.stringify(state(100)));
  remote.version = 100;
  await expect(store.writeState(state(2))).rejects.toThrow();
  await expect(store.writeState(state(2))).rejects.toThrow();
  expect(JSON.parse(remote.body.toString()).revision).toBe(100);
});
