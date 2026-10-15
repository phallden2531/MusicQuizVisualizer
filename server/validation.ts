import { z } from 'zod';
import { parseBuffer } from 'music-metadata';
import { randomUUID } from 'node:crypto';
import type { AssetInfo } from '../shared/types.js';
import { requireRule } from './game.js';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const quizSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    colleagues: z.array(z.object({ id, name: z.string().trim().min(1).max(80) })).max(100),
    songs: z
      .array(
        z.object({
          id,
          title: z.string().trim().min(1).max(120),
          lyrics: z.string().max(30000),
          audioId: z.union([id, z.literal('')]),
          imageId: z.union([id, z.literal('')]),
          durationMs: z.number().finite().min(0).max(1800000),
          correctColleagueId: z.union([id, z.literal('')]),
        }),
      )
      .max(50),
  })
  .superRefine((quiz, ctx) => {
    for (const list of [quiz.colleagues, quiz.songs]) {
      if (new Set(list.map((item) => item.id)).size !== list.length)
        ctx.addIssue({ code: 'custom', message: 'Identifiers must be unique.' });
    }
    if (new Set(quiz.colleagues.map((c) => c.name.toLowerCase())).size !== quiz.colleagues.length)
      ctx.addIssue({ code: 'custom', message: 'Colleague names must be unique.' });
  });
export const joinSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a nickname.')
    .max(30, 'Use at most 30 characters.')
    .regex(/^[^\p{Cc}\p{Cf}]+$/u, 'Use a readable nickname.'),
});
export const commandSchema = z.object({
  command: z.enum(['start', 'pause', 'resume', 'reveal', 'finish']),
  requestId: z.string().min(1).max(100),
  runId: z.string().uuid(),
});
export const answerSchema = z.object({ colleagueId: id, runId: z.string().uuid() });
export const readySchema = z.object({ songId: id, durationMs: z.number().finite().positive() });
export const playbackSchema = z.object({
  event: z.enum(['ended', 'progress', 'error']),
  positionMs: z.number().finite().nonnegative(),
  runId: z.string().uuid(),
});

export async function inspectAsset(kind: string, data: Buffer): Promise<AssetInfo> {
  requireRule(kind === 'audio' || kind === 'image', 'Choose audio or image.');
  requireRule(data.length > 0, 'The file is empty.');
  if (kind === 'image') {
    requireRule(data.length <= 10 * 1024 * 1024, 'Pictures must be 10 MB or smaller.');
    let contentType = '';
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      contentType = 'image/png';
    else if (data[0] === 255 && data[1] === 216 && data[2] === 255) contentType = 'image/jpeg';
    else if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP')
      contentType = 'image/webp';
    requireRule(contentType, 'Upload a JPEG, PNG, or WebP picture.');
    return { id: randomUUID(), kind, contentType, size: data.length };
  }
  let metadata;
  try {
    metadata = await parseBuffer(data, undefined, { duration: true, skipCovers: true });
  } catch {
    throw new Error('Upload a valid MP3 or M4A audio file.');
  }
  const format = metadata.format;
  const isMp3 = format.container === 'MPEG';
  const isM4a =
    (format.container ?? '')
      .split('/')
      .some((brand) => ['M4A', 'isom', 'MP4', 'mp41', 'mp42'].includes(brand)) &&
    Boolean(format.numberOfChannels);
  requireRule(isMp3 || isM4a, 'Upload an MP3 or M4A audio file.');
  const durationMs = Math.round((format.duration ?? 0) * 1000);
  requireRule(
    durationMs > 0 && durationMs <= 1800000,
    'Audio must be between 1 second and 30 minutes.',
  );
  return {
    id: randomUUID(),
    kind,
    contentType: isMp3 ? 'audio/mpeg' : 'audio/mp4',
    size: data.length,
    durationMs,
  };
}
