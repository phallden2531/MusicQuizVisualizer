import { Mp3Encoder } from '@breezystack/lamejs';
export function makeAudio(seconds = 2) {
  const rate = 44100;
  const encoder = new Mp3Encoder(1, rate, 128);
  const buffers: Buffer[] = [];
  for (let start = 0; start < rate * seconds; start += 1152) {
    const pcm = new Int16Array(Math.min(1152, rate * seconds - start));
    for (let i = 0; i < pcm.length; i++)
      pcm[i] = Math.round(1200 * Math.sin((2 * Math.PI * 220 * (start + i)) / rate));
    buffers.push(Buffer.from(encoder.encodeBuffer(pcm)));
  }
  buffers.push(Buffer.from(encoder.flush()));
  return Buffer.concat(buffers);
}
export const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=',
  'base64',
);
