import { EventEmitter } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import type { AppState, Game, Quiz, Role } from '../shared/types.js';
import type { Storage } from './storage.js';
import {
  advance,
  createGame,
  endAudio,
  finishGame,
  joinGame,
  pause,
  project,
  recover,
  removePlayer,
  requireRule,
  resume,
  reveal,
  startRound,
  submitAnswer,
} from './game.js';

const HEARTBEAT_SAVE_MS = 10000;
const STALL_MS = 8000;
const mediaIds = (quiz: Quiz) => quiz.songs.flatMap((s) => [s.audioId, s.imageId]).filter(Boolean);

export class QuizService extends EventEmitter {
  state: AppState;
  screenId: string | null = null;
  readySongId: string | null = null;
  connectedPlayers = new Map<string, Set<string>>();
  private queue: Promise<unknown> = Promise.resolve();
  private savedAt = 0;
  private constructor(
    public storage: Storage,
    private now: () => number,
    state: AppState,
  ) {
    super();
    this.state = state;
  }
  static async open(storage: Storage, now: () => number = Date.now) {
    const saved = await storage.readState();
    const state: AppState = saved ?? {
      schemaVersion: 1,
      revision: 0,
      quiz: { title: 'The colleagues sessions', colleagues: [], songs: [] },
      game: null,
    };
    requireRule(state.schemaVersion === 1, 'Unsupported saved data version.');
    if (state.game) {
      recover(state.game, now());
      state.revision++;
      await storage.writeState(state);
    }
    return new QuizService(storage, now, state);
  }
  /**
   * Applies one change in arrival order, persists it, then publishes it.
   * Unchanged state is neither written nor published. A heartbeat only refreshes
   * playback bookkeeping that nobody watches live, so it is kept in memory and
   * saved at most every HEARTBEAT_SAVE_MS for crash recovery.
   */
  private mutate<T>(operation: (state: AppState, now: number) => T, heartbeat = false): Promise<T> {
    // Capture arrival before waiting on earlier Blob writes. Queue latency must
    // never change an answer's score or its eligibility at the deadline.
    const receivedAt = this.now();
    const task = this.queue.then(async () => {
      const before = JSON.stringify(this.state);
      const draft = structuredClone(this.state);
      const now = receivedAt;
      if (draft.game) advance(draft.game, now);
      const result = operation(draft, now);
      if (JSON.stringify(draft) === before) return result;
      if (heartbeat && now - this.savedAt < HEARTBEAT_SAVE_MS) {
        this.state = draft;
        return result;
      }
      draft.revision++;
      await this.storage.writeState(draft);
      this.state = draft;
      this.savedAt = now;
      if (!heartbeat) this.emit('change');
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  /** Deletes media no longer referenced by the quiz or the live game. Best effort. */
  private async deleteUnused(candidates: Iterable<string>) {
    const kept = new Set([
      ...mediaIds(this.state.quiz),
      ...(this.state.game ? mediaIds(this.state.game.quiz) : []),
    ]);
    for (const id of new Set(candidates)) {
      if (kept.has(id)) continue;
      await this.storage
        .deleteAsset(id)
        .catch((error: Error) =>
          console.error(
            JSON.stringify({
              level: 'error',
              event: 'media_delete_failed',
              message: error.message,
            }),
          ),
        );
    }
  }
  async saveQuiz(quiz: Quiz) {
    const previous = mediaIds(this.state.quiz);
    const saved = await this.mutate((state) => {
      state.quiz = structuredClone(quiz);
      return state.quiz;
    });
    await this.deleteUnused(previous);
    return saved;
  }
  async newGame() {
    const previous = this.state.game ? mediaIds(this.state.game.quiz) : [];
    const game = await this.mutate((state, now) => {
      requireRule(
        !state.game || ['lobby', 'finished'].includes(state.game.phase),
        'Finish the current game before creating another.',
      );
      const code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      state.game = createGame(state.quiz, code, now);
      state.commandIds = [];
      return state.game;
    });
    this.readySongId = null;
    this.emit('change');
    await this.deleteUnused(previous);
    return game;
  }
  getGame(roomCode?: string): Game {
    const game = this.state.game;
    requireRule(
      game && (!roomCode || game.roomCode === roomCode.toUpperCase()),
      'Game not found. Check the room code.',
      404,
    );
    return game;
  }
  async join(roomCode: string, name: string) {
    return this.mutate((state) => {
      const game = state.game;
      requireRule(
        game && game.roomCode === roomCode.toUpperCase(),
        'Game not found. Check the room code.',
        404,
      );
      const player = { id: randomUUID(), token: randomBytes(32).toString('hex'), name };
      joinGame(game, player.id, player.token, player.name);
      return player;
    });
  }
  async removePlayer(playerId: string) {
    await this.mutate((state) => {
      requireRule(state.game, 'Create a game first.');
      removePlayer(state.game, playerId);
    });
  }
  player(roomCode: string, token: string | undefined) {
    const player = this.getGame(roomCode).players.find((p) => p.token === token);
    requireRule(player, 'Please join this game first.', 401);
    return player;
  }
  view(role: Role, playerId?: string) {
    const game = this.getGame();
    const view = project(game, role, playerId, this.now());
    view.players = view.players.map((p) => ({
      ...p,
      connected: Boolean(this.connectedPlayers.get(p.id)?.size),
    }));
    if (role === 'host') {
      view.screenConnected = this.screenId !== null;
      view.screenReady =
        this.readySongId === this.expectedAudioSong()?.id && this.screenId !== null;
    }
    return view;
  }
  expectedAudioSong() {
    const game = this.state.game;
    if (!game || game.phase === 'finished') return undefined;
    return game.quiz.songs[
      ['lobby', 'results'].includes(game.phase) ? game.roundIndex + 1 : game.roundIndex
    ];
  }
  attachScreen(socketId: string) {
    requireRule(
      !this.screenId || this.screenId === socketId,
      'A presentation screen is already connected. Close that tab first.',
    );
    this.screenId = socketId;
    this.readySongId = null;
    this.emit('change');
  }
  async detachScreen(socketId: string) {
    if (this.screenId !== socketId) return;
    this.screenId = null;
    this.readySongId = null;
    if (this.state.game && ['playing', 'grace'].includes(this.state.game.phase)) {
      await this.mutate((state, now) => {
        pause(state.game!, now, 'Presentation screen disconnected. Reconnect it, then resume.');
      });
    } else this.emit('change');
  }
  markReady(socketId: string, songId: string, durationMs: number) {
    requireRule(this.screenId === socketId, 'Presentation connection required.', 403);
    const song = this.expectedAudioSong();
    requireRule(song && song.id === songId, 'The song changed. Reloading audio.');
    requireRule(
      Number.isFinite(durationMs) && Math.abs(song.durationMs - durationMs) < 2000,
      'Audio duration could not be verified.',
    );
    this.readySongId = song.id;
    this.emit('change');
  }
  async command(
    command: 'start' | 'pause' | 'resume' | 'reveal' | 'finish',
    requestId: string,
    expectedRunId: string,
  ) {
    return this.mutate((state, now) => {
      if (state.commandIds?.includes(requestId)) return;
      const game = state.game;
      requireRule(game, 'Create a game first.');
      requireRule(game.runId === expectedRunId, 'The round changed. Please try again.');
      if (command === 'start') {
        const isFinal = game.phase === 'results' && game.roundIndex + 1 === game.quiz.songs.length;
        if (!isFinal) {
          requireRule(
            this.screenId && this.readySongId === this.expectedAudioSong()?.id,
            'Open the presentation screen and enable audio first.',
          );
          requireRule(game.players.length > 0, 'Wait for at least one player to join.');
        }
        startRound(game, now);
      } else if (command === 'pause') pause(game, now, 'Paused by the host.');
      else if (command === 'resume') {
        requireRule(
          this.screenId && this.readySongId === this.expectedAudioSong()?.id,
          'Reconnect the presentation screen and enable audio first.',
        );
        resume(game, now);
      } else if (command === 'reveal') reveal(game, now);
      else finishGame(game);
      state.commandIds = [...(state.commandIds ?? []), requestId].slice(-200);
    });
  }
  async answer(roomCode: string, token: string, colleagueId: string, runId: string) {
    const player = this.player(roomCode, token);
    return this.mutate((state, now) => {
      const game = state.game!;
      requireRule(
        game.roomCode === roomCode && game.runId === runId,
        'The round changed. Please try again.',
      );
      // A retry of the same answer is safe; changing a locked answer is not.
      if (game.answers[game.roundIndex]?.[player.id]?.colleagueId === colleagueId) return;
      submitAnswer(game, player.id, colleagueId, now);
    });
  }
  async playback(
    socketId: string,
    event: 'ended' | 'progress' | 'error',
    runId: string,
    positionMs: number,
  ) {
    requireRule(this.screenId === socketId, 'Presentation connection required.', 403);
    return this.mutate((state, now) => {
      const game = state.game;
      if (!game || game.runId !== runId || game.phase !== 'playing' || game.paused) return;
      if (event === 'error') {
        pause(
          game,
          now,
          'Audio playback stopped. Enable audio on the presentation screen, then resume.',
        );
        return;
      }
      const duration = game.quiz.songs[game.roundIndex].durationMs;
      requireRule(
        Number.isFinite(positionMs) && positionMs >= 0 && positionMs <= duration + 2000,
        'Invalid playback position.',
      );
      if (positionMs > game.playbackPositionMs + 20) {
        game.playbackPositionMs = Math.min(duration, positionMs);
        game.heartbeatAt = now;
      }
      if (event === 'ended') {
        requireRule(positionMs >= duration - 2000, 'The song has not finished.');
        endAudio(game, now, runId);
      }
    }, event === 'progress');
  }
  async tick() {
    const game = this.state.game;
    if (!game || game.paused) return;
    const now = this.now();
    const timedTransition =
      (game.phase === 'grace' && game.deadline !== null && now >= game.deadline) ||
      (game.phase === 'revealing' && game.revealEndsAt !== null && now >= game.revealEndsAt);
    const stalled = game.phase === 'playing' && now - game.heartbeatAt > STALL_MS;
    if (timedTransition || stalled)
      await this.mutate((state, currentNow) => {
        const live = state.game!;
        advance(live, currentNow);
        if (live.phase === 'playing' && currentNow - live.heartbeatAt > STALL_MS) {
          // Stop the clock where the audio stopped, so silence costs nobody points.
          // Never before a guess already recorded, which keeps elapsed times ordered.
          const answeredAt = Object.values(live.answers[live.roundIndex] ?? {}).map(
            (a) => a.submittedAt,
          );
          pause(
            live,
            Math.max(live.heartbeatAt, live.clockAt ?? 0, ...answeredAt),
            'Audio connection interrupted. Check the presentation screen, then resume.',
          );
        }
      });
  }
}
