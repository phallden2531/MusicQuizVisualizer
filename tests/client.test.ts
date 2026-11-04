import { afterEach, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveClient } from '../server/client';

let directory: string;
afterEach(() => rm(directory, { recursive: true, force: true }));

it('revalidates the page on every visit but caches fingerprinted assets forever', async () => {
  directory = await mkdtemp(join(tmpdir(), 'quiz-client-'));
  await mkdir(join(directory, 'assets'));
  await writeFile(join(directory, 'index.html'), '<!doctype html>');
  await writeFile(join(directory, 'assets', 'index-abc123.js'), 'console.log(1)');
  const app = express();
  serveClient(app, directory);
  for (const path of ['/', '/host', '/join/ABC123']) {
    const page = await request(app).get(path);
    expect(page.status).toBe(200);
    expect(page.headers['cache-control']).toBe('no-cache');
  }
  const asset = await request(app).get('/assets/index-abc123.js');
  expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
});
