import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { AppState, AssetInfo } from '../shared/types.js';

/** Inclusive byte range within an asset. */
export interface ByteRange {
  start: number;
  end: number;
}
export interface Storage {
  readState(): Promise<AppState | null>;
  writeState(state: AppState): Promise<void>;
  putAsset(info: AssetInfo, data: Buffer): Promise<void>;
  getAssetInfo(id: string): Promise<AssetInfo | null>;
  readAsset(id: string, range?: ByteRange): Promise<Buffer | null>;
  deleteAsset(id: string): Promise<void>;
}
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,80}$/.test(id);
function isNotFound(error: unknown) {
  return (
    (error as { code?: string; statusCode?: number }).code === 'ENOENT' ||
    (error as { statusCode?: number }).statusCode === 404
  );
}

export class LocalStorage implements Storage {
  constructor(private directory: string) {}
  private async atomic(name: string, data: string | Buffer) {
    await mkdir(this.directory, { recursive: true });
    const temporary = join(this.directory, `${name}.${randomUUID()}.tmp`);
    await writeFile(temporary, data);
    await rename(temporary, join(this.directory, name));
  }
  async readState(): Promise<AppState | null> {
    try {
      return JSON.parse(await readFile(join(this.directory, 'state.json'), 'utf8'));
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  async writeState(state: AppState) {
    await this.atomic('state.json', JSON.stringify(state));
  }
  async putAsset(info: AssetInfo, data: Buffer) {
    if (!validId(info.id)) throw new Error('Invalid asset identifier');
    await this.atomic(`${info.id}.bin`, data);
    await this.atomic(`${info.id}.json`, JSON.stringify(info));
  }
  async getAssetInfo(id: string): Promise<AssetInfo | null> {
    if (!validId(id)) return null;
    try {
      return JSON.parse(await readFile(join(this.directory, `${id}.json`), 'utf8'));
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  async readAsset(id: string, range?: ByteRange): Promise<Buffer | null> {
    if (!validId(id)) return null;
    try {
      const path = join(this.directory, `${id}.bin`);
      if (!range) return await readFile(path);
      const file = await open(path);
      try {
        const data = Buffer.alloc(range.end - range.start + 1);
        const { bytesRead } = await file.read(data, 0, data.length, range.start);
        return data.subarray(0, bytesRead);
      } finally {
        await file.close();
      }
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  async deleteAsset(id: string) {
    if (!validId(id)) return;
    await rm(join(this.directory, `${id}.json`), { force: true });
    await rm(join(this.directory, `${id}.bin`), { force: true });
  }
}

export class AzureStorage implements Storage {
  private container: ContainerClient;
  private etag?: string;
  constructor(accountUrl: string, containerName = 'quiz') {
    this.container = new BlobServiceClient(
      accountUrl,
      new DefaultAzureCredential(),
    ).getContainerClient(containerName);
  }
  async readState(): Promise<AppState | null> {
    try {
      const response = await this.container.getBlockBlobClient('state.json').download();
      this.etag = response.etag;
      const chunks: Buffer[] = [];
      for await (const chunk of response.readableStreamBody!) chunks.push(Buffer.from(chunk));
      const state: AppState = JSON.parse(Buffer.concat(chunks).toString());
      if (state.schemaVersion !== 1) throw new Error('Unsupported state schema');
      return state;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  async writeState(state: AppState) {
    const blob = this.container.getBlockBlobClient('state.json');
    const data = Buffer.from(JSON.stringify(state));
    const previousEtag = this.etag;
    try {
      const result = await blob.uploadData(data, {
        conditions: this.etag ? { ifMatch: this.etag } : { ifNoneMatch: '*' },
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
      this.etag = result.etag;
    } catch (error) {
      // An upload may commit before a connection fails. Adopt its ETag only
      // after verifying the entire intended document, not just its revision.
      try {
        const saved = await this.readState();
        if (JSON.stringify(saved) === data.toString()) return;
      } catch {
        /* Keep the original failure and retry safely with the old ETag. */
      }
      this.etag = previousEtag;
      throw error;
    }
  }
  async putAsset(info: AssetInfo, data: Buffer) {
    if (!validId(info.id)) throw new Error('Invalid asset identifier');
    await this.container.getBlockBlobClient(`media/${info.id}`).uploadData(data, {
      conditions: { ifNoneMatch: '*' },
      metadata: { info: Buffer.from(JSON.stringify(info)).toString('base64') },
      blobHTTPHeaders: { blobContentType: info.contentType },
    });
  }
  async getAssetInfo(id: string): Promise<AssetInfo | null> {
    if (!validId(id)) return null;
    try {
      // Properties carry the metadata without downloading the media itself.
      const properties = await this.container.getBlockBlobClient(`media/${id}`).getProperties();
      return JSON.parse(Buffer.from(properties.metadata!.info, 'base64').toString());
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  async readAsset(id: string, range?: ByteRange): Promise<Buffer | null> {
    if (!validId(id)) return null;
    try {
      const response = await this.container
        .getBlockBlobClient(`media/${id}`)
        .download(range?.start ?? 0, range ? range.end - range.start + 1 : undefined);
      const chunks: Buffer[] = [];
      for await (const chunk of response.readableStreamBody!) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
  async deleteAsset(id: string) {
    if (!validId(id)) return;
    await this.container.getBlockBlobClient(`media/${id}`).deleteIfExists();
  }
}
