import { beforeEach, expect, it, vi } from 'vitest';
import type { AppState } from '../shared/types';
import { AzureStorage } from '../server/storage';

const remote = vi.hoisted(() => ({
  body: null as Buffer | null,
  version: 0,
  loseResponse: false,
  failBeforeCommit: false,
  media: new Map<string, { data: Buffer; metadata: Record<string, string> }>(),
  fullDownloads: 0,
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
  const media = (name: string) => ({
    async uploadData(data: Buffer, options: { metadata: Record<string, string> }) {
      remote.media.set(name, { data: Buffer.from(data), metadata: options.metadata });
    },
    async getProperties() {
      const item = remote.media.get(name);
      if (!item) throw failure(404);
      return { metadata: item.metadata, contentLength: item.data.length };
    },
    async download(offset = 0, count?: number) {
      const item = remote.media.get(name);
      if (!item) throw failure(404);
      if (offset === 0 && count === undefined) remote.fullDownloads++;
      const end = count === undefined ? item.data.length : offset + count;
      return { readableStreamBody: Readable.from([item.data.subarray(offset, end)]) };
    },
    async deleteIfExists() {
      remote.media.delete(name);
    },
  });
  return {
    BlobServiceClient: class {
      getContainerClient() {
        return {
          getBlockBlobClient: (name: string) => (name === 'state.json' ? blob : media(name)),
        };
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
  remote.media.clear();
  remote.fullDownloads = 0;
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
it('reads media metadata and byte ranges without downloading whole files', async () => {
  const store = new AzureStorage('https://example.blob.core.windows.net');
  const info = { id: 'clip', kind: 'audio' as const, contentType: 'audio/mpeg', size: 10 };
  await store.putAsset(info, Buffer.from('0123456789'));
  expect(await store.getAssetInfo('clip')).toEqual(info);
  expect((await store.readAsset('clip', { start: 3, end: 6 }))?.toString()).toBe('3456');
  expect(remote.fullDownloads).toBe(0);
  await store.deleteAsset('clip');
  expect(await store.getAssetInfo('clip')).toBeNull();
});
