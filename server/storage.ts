import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { AppState, AssetInfo } from '../shared/types.js';

export interface StoredAsset {
  info: AssetInfo;
  data: Buffer;
}
export interface Storage {
  readState(): Promise<AppState | null>;
  writeState(state: AppState): Promise<void>;
  putAsset(info: AssetInfo, data: Buffer): Promise<void>;
  getAsset(id: string): Promise<StoredAsset | null>;
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
  async getAsset(id: string): Promise<StoredAsset | null> {
    if (!validId(id)) return null;
    try {
      const [info, data] = await Promise.all([
        readFile(join(this.directory, `${id}.json`), 'utf8'),
        readFile(join(this.directory, `${id}.bin`)),
      ]);
      return { info: JSON.parse(info), data };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
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
  async getAsset(id: string): Promise<StoredAsset | null> {
    if (!validId(id)) return null;
    try {
      const blob = this.container.getBlockBlobClient(`media/${id}`);
      const response = await blob.download();
      const chunks: Buffer[] = [];
      for await (const chunk of response.readableStreamBody!) chunks.push(Buffer.from(chunk));
      return {
        info: JSON.parse(Buffer.from(response.metadata!.info, 'base64').toString()),
        data: Buffer.concat(chunks),
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
}
