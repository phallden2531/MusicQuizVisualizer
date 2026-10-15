import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { inspectAsset } from '../server/validation';

it('accepts an actual M4A audio file with multiple MP4 compatible brands', async () => {
  const audio = await readFile(new URL('./assets/tone.m4a', import.meta.url));
  const info = await inspectAsset('audio', audio);
  expect(info.kind).toBe('audio');
  expect(info.contentType).toBe('audio/mp4');
  expect(info.durationMs).toBeGreaterThanOrEqual(900);
  expect(info.durationMs).toBeLessThan(1200);
});
