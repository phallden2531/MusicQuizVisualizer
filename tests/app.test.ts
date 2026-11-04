import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { io as connect, type Socket } from 'socket.io-client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../server/app';
import { QuizService } from '../server/service';
import { LocalStorage } from '../server/storage';
import { makeAudio, image } from './fixtures';

let runtime: Awaited<ReturnType<typeof createApplication>>;
let directory: string;
let now: number;
let baseURL: string;
const sockets: Socket[] = [];
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'quiz-api-'));
  now = 1000;
  const service = await QuizService.open(new LocalStorage(directory), () => now);
  runtime = await createApplication({
    service,
    hostPassword: 'test-password',
    sessionSecret: 'a-long-test-session-secret-with-32-characters',
    production: false,
  });
  await new Promise<void>((resolve) => runtime.http.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${(runtime.http.address() as { port: number }).port}`;
});
afterEach(async () => {
  sockets.splice(0).forEach((socket) => socket.disconnect());
  await runtime.close();
  await rm(directory, { recursive: true, force: true });
});
async function host() {
  const agent = request.agent(runtime.app);
  const login = await agent.post('/api/host/login').send({ password: 'test-password' });
  expect(login.status).toBe(200);
  return { agent, cookie: login.headers['set-cookie'][0].split(';')[0] };
}
async function prepare() {
  const { agent, cookie } = await host();
  const audio = await agent
    .post('/api/assets')
    .field('kind', 'audio')
    .attach('file', makeAudio(), 'fixture.mp3');
  expect(audio.status).toBe(201);
  const picture = await agent
    .post('/api/assets')
    .field('kind', 'image')
    .attach('file', image, 'portrait.png');
  expect(picture.status).toBe(201);
  const quiz = {
    title: 'Team quiz',
    colleagues: [
      { id: 'alex', name: 'Alex' },
      { id: 'sam', name: 'Sam' },
    ],
    songs: [
      {
        id: 'song1',
        title: 'Keep secret',
        lyrics: 'Hello Alex',
        audioId: audio.body.id,
        imageId: picture.body.id,
        durationMs: audio.body.durationMs,
        correctColleagueId: 'sam',
      },
    ],
  };
  expect((await agent.put('/api/quiz').send(quiz)).status).toBe(200);
  const game = await agent.post('/api/games').send({});
  expect(game.status).toBe(201);
  return { agent, cookie, quiz, room: game.body.roomCode, runId: game.body.runId };
}
async function socket(auth: object, cookie?: string) {
  const client = connect(baseURL, {
    auth,
    extraHeaders: cookie ? { Cookie: cookie } : {},
    reconnection: false,
  });
  sockets.push(client);
  await new Promise<void>((resolve, reject) => {
    client.on('connect', resolve);
    client.on('connect_error', reject);
  });
  return client;
}
const ack = (client: Socket, event: string, payload: object) =>
  new Promise<any>((resolve) => client.emit(event, payload, resolve));

describe('host setup and access', () => {
  it('requires login and blocks incorrect passwords and cross-origin writes', async () => {
    expect((await request(runtime.app).get('/api/host')).status).toBe(401);
    expect(
      (await request(runtime.app).post('/api/host/login').send({ password: 'wrong' })).status,
    ).toBe(401);
    const { agent } = await host();
    expect((await agent.get('/api/host')).status).toBe(200);
    expect(
      (await agent.put('/api/quiz').set('Origin', 'https://attacker.example').send({})).status,
    ).toBe(403);
    await agent.post('/api/host/logout');
    expect((await agent.get('/api/host')).status).toBe(401);
  });
  it('validates uploaded contents rather than accepting renamed files', async () => {
    const { agent } = await host();
    expect(
      (
        await agent
          .post('/api/assets')
          .field('kind', 'image')
          .attach('file', Buffer.from('<svg></svg>'), 'picture.png')
      ).status,
    ).toBe(400);
    expect(
      (
        await agent
          .post('/api/assets')
          .field('kind', 'audio')
          .attach('file', Buffer.from('not audio'), 'song.mp3')
      ).status,
    ).toBe(400);
  });
  it('does not trust edited audio durations or asset types', async () => {
    const { agent, quiz } = await prepare();
    quiz.songs[0].durationMs = 999999;
    const saved = await agent.put('/api/quiz').send(quiz);
    expect(saved.body.songs[0].durationMs).toBeLessThan(5000);
    quiz.songs[0].imageId = quiz.songs[0].audioId;
    expect((await agent.put('/api/quiz').send(quiz)).status).toBe(400);
  });
  it('saves an untitled draft song and explains invalid input in plain words', async () => {
    const { agent } = await host();
    const draft = {
      title: 'Team quiz',
      colleagues: [{ id: 'alex', name: 'Alex' }],
      songs: [
        {
          id: 'draft',
          title: '',
          lyrics: '',
          audioId: '',
          imageId: '',
          durationMs: 0,
          correctColleagueId: '',
        },
      ],
    };
    expect((await agent.put('/api/quiz').send(draft)).status).toBe(200);
    draft.colleagues[0].name = ' ';
    const invalid = await agent.put('/api/quiz').send(draft);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Every colleague needs a name.');
  });
  it('serves byte ranges and lets browsers cache media that never changes', async () => {
    const { agent, quiz } = await prepare();
    const full = await agent.get(`/api/assets/${quiz.songs[0].audioId}`);
    expect(full.status).toBe(200);
    expect(full.headers['cache-control']).toBe('private, max-age=31536000, immutable');
    const part = await agent
      .get(`/api/assets/${quiz.songs[0].audioId}`)
      .set('Range', 'bytes=10-19')
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(part.status).toBe(206);
    expect(part.headers['content-range']).toBe(`bytes 10-19/${full.body.length}`);
    expect((part.body as Buffer).equals(full.body.subarray(10, 20))).toBe(true);
    expect((await agent.get('/api/assets/missing-id')).status).toBe(404);
  });
  it('lets the host remove a player from the lobby', async () => {
    const { agent, room } = await prepare();
    const joined = await request(runtime.app)
      .post(`/api/games/${room}/join`)
      .send({ name: 'Prankster' });
    expect((await request(runtime.app).delete(`/api/game/players/${joined.body.id}`)).status).toBe(
      401,
    );
    expect((await agent.delete(`/api/game/players/${joined.body.id}`)).status).toBe(200);
    await expect(
      socket({ role: 'player', roomCode: room, token: joined.body.token }),
    ).rejects.toThrow(/join/i);
  });
});
describe('live transport', () => {
  it('keeps all 15 connected players synchronized through a complete round', async () => {
    const { agent, cookie, room, runId, quiz } = await prepare();
    const joined = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        request(runtime.app)
          .post(`/api/games/${room}/join`)
          .send({ name: `Detective ${i}` }),
      ),
    );
    expect(joined.every((result) => result.status === 201)).toBe(true);
    const players = await Promise.all(
      joined.map((result) => socket({ role: 'player', roomCode: room, token: result.body.token })),
    );
    const screen = await socket({ role: 'screen', roomCode: room }, cookie);
    await ack(screen, 'screen:ready', { songId: 'song1', durationMs: quiz.songs[0].durationMs });
    await agent
      .post('/api/game/command')
      .send({ command: 'start', requestId: 'start-fifteen', runId });
    const roundRun = runtime.service.state.game!.runId;
    const answers = await Promise.all(
      players.map((player, i) =>
        ack(player, 'answer', { colleagueId: i % 2 === 0 ? 'sam' : 'alex', runId: roundRun }),
      ),
    );
    expect(answers.every((answer) => answer.ok)).toBe(true);
    expect((await ack(players[0], 'snapshot', {})).data.answerCount).toBe(15);
    now += quiz.songs[0].durationMs;
    await ack(screen, 'playback', {
      event: 'ended',
      positionMs: quiz.songs[0].durationMs,
      runId: roundRun,
    });
    now += 15000;
    await runtime.service.tick();
    await agent
      .post('/api/game/command')
      .send({ command: 'reveal', requestId: 'reveal-fifteen', runId: roundRun });
    now += 5000;
    await runtime.service.tick();
    const results = await Promise.all(players.map((player) => ack(player, 'snapshot', {})));
    expect(
      results.every(
        (result) => result.data.correctName === 'Sam' && result.data.standings.length === 15,
      ),
    ).toBe(true);
    expect(results.filter((result) => result.data.myResult.correct)).toHaveLength(8);
    expect(
      results[0].data.standings.filter((p: { score: number }) => p.score === 1000),
    ).toHaveLength(8);
  });
  it('keeps private media and host roles inaccessible to players', async () => {
    const { room, quiz } = await prepare();
    const joined = await request(runtime.app)
      .post(`/api/games/${room}/join`)
      .send({ name: 'Alice' });
    const token = joined.body.token;
    expect((await request(runtime.app).get(`/api/assets/${quiz.songs[0].imageId}`)).status).toBe(
      401,
    );
    expect(
      (
        await request(runtime.app)
          .get(`/api/games/${room}/image`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(runtime.app)
          .get(`/api/games/${room}/audio/song1`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(401);
    await expect(socket({ role: 'screen', roomCode: room, token })).rejects.toThrow(/host/i);
    const player = await socket({ role: 'player', roomCode: room, token });
    const snapshot = await ack(player, 'snapshot', {});
    expect(snapshot.ok).toBe(true);
    expect(JSON.stringify(snapshot.data)).not.toContain('Keep secret');
    expect(JSON.stringify(snapshot.data)).not.toContain(quiz.songs[0].imageId);
    const spoof = await ack(player, 'screen:ready', { songId: 'song1', durationMs: 2000 });
    expect(spoof.ok).toBe(false);
  });
  it('runs a round, preserves identity on reconnect, and closes answers before revealing', async () => {
    const { agent, cookie, room, runId, quiz } = await prepare();
    const joined = await request(runtime.app)
      .post(`/api/games/${room}/join`)
      .send({ name: 'Alice' });
    const player = await socket({ role: 'player', roomCode: room, token: joined.body.token });
    const screen = await socket({ role: 'screen', roomCode: room }, cookie);
    expect(
      (await ack(screen, 'screen:ready', { songId: 'song1', durationMs: quiz.songs[0].durationMs }))
        .ok,
    ).toBe(true);
    expect(
      (
        await agent
          .post('/api/game/command')
          .send({ command: 'start', requestId: 'start-1', runId })
      ).status,
    ).toBe(200);
    const liveRun = runtime.service.state.game!.runId;
    expect((await ack(player, 'answer', { colleagueId: 'sam', runId: liveRun })).ok).toBe(true);
    expect((await ack(player, 'answer', { colleagueId: 'alex', runId: liveRun })).ok).toBe(false);
    player.disconnect();
    const reconnected = await socket({ role: 'player', roomCode: room, token: joined.body.token });
    const snapshot = await ack(reconnected, 'snapshot', {});
    expect(snapshot.data.myAnswer.colleagueId).toBe('sam');
    now += quiz.songs[0].durationMs;
    await ack(screen, 'playback', {
      event: 'ended',
      positionMs: quiz.songs[0].durationMs,
      runId: liveRun,
    });
    now += 15000;
    await runtime.service.tick();
    expect(runtime.service.state.game!.phase).toBe('locked');
    await agent
      .post('/api/game/command')
      .send({ command: 'reveal', requestId: 'reveal-1', runId: liveRun });
    const imageResponse = await request(runtime.app)
      .get(`/api/games/${room}/image`)
      .set('Authorization', `Bearer ${joined.body.token}`);
    expect(imageResponse.status).toBe(200);
    now += 5000;
    await runtime.service.tick();
    expect((await ack(reconnected, 'snapshot', {})).data.correctName).toBe('Sam');
    expect((await agent.post(`/api/games/${room}/join`).send({ name: 'Late' })).status).toBe(400);
  });
  it('allows only one presentation screen and pauses on disconnect', async () => {
    const { agent, cookie, room, runId, quiz } = await prepare();
    await request(runtime.app).post(`/api/games/${room}/join`).send({ name: 'Alice' });
    const screen = await socket({ role: 'screen', roomCode: room }, cookie);
    await expect(socket({ role: 'screen', roomCode: room }, cookie)).rejects.toThrow(/already/i);
    await ack(screen, 'screen:ready', { songId: 'song1', durationMs: quiz.songs[0].durationMs });
    await agent.post('/api/game/command').send({ command: 'start', requestId: 'start-2', runId });
    screen.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(runtime.service.state.game!.paused).toBe(true);
  });
});
