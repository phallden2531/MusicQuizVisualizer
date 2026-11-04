import { describe, expect, it } from 'vitest';
import type { AppState, AssetInfo } from '../shared/types';
import type { Storage } from '../server/storage';
import { QuizService } from '../server/service';

const fixture = {
  title: 'Quiz',
  colleagues: [
    { id: 'alex', name: 'Alex' },
    { id: 'sam', name: 'Sam' },
  ],
  songs: [
    {
      id: 'song',
      title: 'Private',
      lyrics: 'Hello Alex',
      audioId: 'audio',
      imageId: 'picture',
      durationMs: 60000,
      correctColleagueId: 'sam',
    },
  ],
};
class MemoryStore implements Storage {
  state: AppState | null = null;
  fail = false;
  writes = 0;
  deleted: string[] = [];
  beforeWrite?: () => Promise<void>;
  async readState() {
    return structuredClone(this.state);
  }
  async writeState(state: AppState) {
    await this.beforeWrite?.();
    if (this.fail) throw new Error('Storage unavailable');
    this.writes++;
    this.state = structuredClone(state);
  }
  async putAsset(_info: AssetInfo, _data: Buffer) {}
  async getAssetInfo(_id: string) {
    return null;
  }
  async readAsset(_id: string) {
    return null;
  }
  async deleteAsset(id: string) {
    this.deleted.push(id);
  }
}
async function startedGame(clock: () => number, storage = new MemoryStore()) {
  const service = await QuizService.open(storage, clock);
  await service.saveQuiz(fixture);
  const game = await service.newGame();
  const player = await service.join(game.roomCode, 'Alice');
  service.attachScreen('screen');
  service.markReady('screen', 'song', 60000);
  await service.command('start', 'start', game.runId);
  return { service, storage, game, player, runId: service.state.game!.runId };
}
describe('serialized game service', () => {
  it('accepts a guess received before the deadline even when earlier writes delay processing', async () => {
    let now = 1000;
    const storage = new MemoryStore();
    const service = await QuizService.open(storage, () => now);
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    const player = await service.join(game.roomCode, 'Alice');
    service.attachScreen('screen');
    service.markReady('screen', 'song', 60000);
    await service.command('start', 'start', game.runId);
    const runId = service.state.game!.runId;
    now = 61000;
    await service.playback('screen', 'ended', runId, 60000);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    storage.beforeWrite = () => gate;
    now = 75000;
    const earlierWrite = service.saveQuiz(fixture);
    await new Promise((resolve) => setImmediate(resolve));
    now = 75999;
    const answer = service.answer(game.roomCode, player.token, 'sam', runId);
    now = 78000;
    release();
    await earlierWrite;
    await expect(answer).resolves.toBeUndefined();
    expect(service.state.game!.answers[0][player.id].elapsedMs).toBe(74999);
    await service.tick();
    expect(service.state.game!.phase).toBe('locked');
  });
  it('pauses when audio position stops advancing despite continued transport heartbeats', async () => {
    let now = 1000;
    const service = await QuizService.open(new MemoryStore(), () => now);
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    await service.join(game.roomCode, 'Alice');
    service.attachScreen('screen');
    service.markReady('screen', 'song', 60000);
    await service.command('start', 'start', game.runId);
    const runId = service.state.game!.runId;
    now = 2000;
    await service.playback('screen', 'progress', runId, 1000);
    now = 5000;
    await service.playback('screen', 'progress', runId, 1000);
    now = 11000;
    await service.playback('screen', 'progress', runId, 1000);
    await service.tick();
    expect(service.state.game!.paused).toBe(true);
    expect(service.state.game!.pauseReason).toMatch(/interrupted/i);
  });
  it('does not publish or retain a change if persistence fails', async () => {
    const storage = new MemoryStore();
    const service = await QuizService.open(storage);
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    storage.fail = true;
    await expect(service.join(game.roomCode, 'Alice')).rejects.toThrow('Storage unavailable');
    expect(service.state.game?.players).toHaveLength(0);
    expect(storage.state?.game?.players).toHaveLength(0);
  });
  it('serializes 15 simultaneous joins and rejects the sixteenth', async () => {
    const service = await QuizService.open(new MemoryStore());
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    const players = await Promise.all(
      Array.from({ length: 15 }, (_, i) => service.join(game.roomCode, `P${i}`)),
    );
    expect(new Set(players.map((p) => p.token)).size).toBe(15);
    expect(service.state.game?.players).toHaveLength(15);
    await expect(service.join(game.roomCode, 'Extra')).rejects.toThrow(/full/);
  });
  it('requires presentation readiness, rejects stale commands, and makes retries idempotent', async () => {
    let now = 1000;
    const service = await QuizService.open(new MemoryStore(), () => now);
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    await service.join(game.roomCode, 'Alice');
    await expect(service.command('start', 'one', game.runId)).rejects.toThrow(/presentation/i);
    service.attachScreen('screen1');
    service.markReady('screen1', 'song', 60000);
    await service.command('start', 'one', game.runId);
    const runId = service.state.game!.runId;
    await service.command('start', 'one', game.runId);
    expect(service.state.game!.runId).toBe(runId);
    await expect(service.command('pause', 'two', game.runId)).rejects.toThrow(/changed/i);
    now = 61000;
    await service.playback('screen1', 'ended', runId, 60000);
    now = 76000;
    await service.tick();
    expect(service.state.game!.phase).toBe('locked');
    await service.command('reveal', 'three', runId);
    now = 81000;
    await service.tick();
    expect(service.state.game!.phase).toBe('results');
  });
  it('recovers saved identities and answers after a restart without counting downtime', async () => {
    let now = 1000;
    const storage = new MemoryStore();
    const service = await QuizService.open(storage, () => now);
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    const player = await service.join(game.roomCode, 'Alice');
    service.attachScreen('screen1');
    service.markReady('screen1', 'song', 60000);
    await service.command('start', 'start', game.runId);
    now = 6000;
    const runId = service.state.game!.runId;
    await service.playback('screen1', 'progress', runId, 5000);
    await service.answer(game.roomCode, player.token, 'sam', runId);
    now = 900000;
    const recovered = await QuizService.open(storage, () => now);
    expect(recovered.player(game.roomCode, player.token).name).toBe('Alice');
    expect(recovered.state.game!.paused).toBe(true);
    expect(recovered.state.game!.elapsedMs).toBe(5000);
    expect(recovered.view('player', player.id).myAnswer?.colleagueId).toBe('sam');
    expect(recovered.view('player', player.id).standings[0].score).toBe(0);
  });
  it('keeps playback heartbeats in memory and saves them at most every 10 seconds', async () => {
    let now = 1000;
    const { service, storage, runId } = await startedGame(() => now);
    const changes: unknown[] = [];
    service.on('change', () => changes.push(1));
    const before = storage.writes;
    for (let i = 1; i <= 8; i++) {
      now = 1000 + i * 1500;
      await service.playback('screen', 'progress', runId, i * 1500);
    }
    expect(service.state.game!.playbackPositionMs).toBe(12000);
    expect(service.state.game!.heartbeatAt).toBe(13000);
    expect(storage.writes - before).toBe(1);
    expect(changes).toHaveLength(0);
  });
  it('does not rewrite or republish state when a command changes nothing', async () => {
    let now = 1000;
    const { service, storage, game } = await startedGame(() => now);
    const before = storage.writes;
    let changes = 0;
    service.on('change', () => changes++);
    await service.command('start', 'start', game.runId);
    expect(storage.writes).toBe(before);
    expect(changes).toBe(0);
  });
  it('pauses a stalled song at its last heartbeat so silence does not count as answering time', async () => {
    let now = 1000;
    const { service, runId } = await startedGame(() => now);
    now = 4000;
    await service.playback('screen', 'progress', runId, 3000);
    now = 12500;
    await service.tick();
    expect(service.state.game!.paused).toBe(true);
    expect(service.state.game!.elapsedMs).toBe(3000);
    expect(service.state.game!.playbackPositionMs).toBe(3000);
  });
  it('deletes replaced media after saving but keeps media the live game still needs', async () => {
    const storage = new MemoryStore();
    const service = await QuizService.open(storage);
    await service.saveQuiz(fixture);
    await service.newGame();
    const replaced = structuredClone(fixture);
    replaced.songs[0].audioId = 'audio2';
    replaced.songs[0].imageId = 'picture2';
    await service.saveQuiz(replaced);
    expect(storage.deleted).toEqual([]);
    const again = structuredClone(replaced);
    again.songs[0].audioId = 'audio3';
    await service.saveQuiz(again);
    expect(storage.deleted).toEqual(['audio2']);
  });
  it('removes a player from the lobby at the host’s request', async () => {
    const service = await QuizService.open(new MemoryStore());
    await service.saveQuiz(fixture);
    const game = await service.newGame();
    const player = await service.join(game.roomCode, 'Alice');
    await service.removePlayer(player.id);
    expect(() => service.player(game.roomCode, player.token)).toThrow(/join/i);
  });
});
