import { randomUUID } from 'node:crypto';
import type { Game, GameView, Quiz, Role, Standing, Vote } from '../shared/types.js';

export class RuleError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function requireRule(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new RuleError(message, status);
}
export function createGame(quiz: Quiz, roomCode: string, now: number): Game {
  requireRule(quiz.songs.length > 0, 'Add at least one song first.');
  requireRule(quiz.colleagues.length > 1, 'Add at least two colleagues first.');
  for (const song of quiz.songs) {
    requireRule(
      song.title.trim() &&
        song.audioId &&
        song.imageId &&
        song.durationMs > 0 &&
        song.lyrics.trim(),
      'Every song needs a title, audio, a picture, and lyrics.',
    );
    requireRule(
      quiz.colleagues.some((c) => c.id === song.correctColleagueId),
      'Choose the correct colleague for every song.',
    );
  }
  return {
    roomCode,
    quiz: structuredClone(quiz),
    phase: 'lobby',
    roundIndex: -1,
    runId: randomUUID(),
    createdAt: now,
    players: [],
    answers: [],
    paused: false,
    pauseReason: null,
    elapsedMs: 0,
    clockAt: null,
    playbackPositionMs: 0,
    deadline: null,
    graceRemainingMs: 15000,
    revealEndsAt: null,
    heartbeatAt: now,
  };
}
export function joinGame(game: Game, id: string, token: string, name: string) {
  requireRule(game.phase === 'lobby', 'This game has already started.');
  requireRule(game.players.length < 15, 'This game is full (15 players).');
  requireRule(
    !game.players.some((p) => p.name.toLowerCase() === name.toLowerCase()),
    'That nickname is already taken.',
  );
  game.players.push({ id, token, name });
}
export function removePlayer(game: Game, id: string) {
  requireRule(game.phase === 'lobby', 'Players can only be removed in the lobby.');
  requireRule(
    game.players.some((p) => p.id === id),
    'Player not found.',
    404,
  );
  game.players = game.players.filter((p) => p.id !== id);
}
export function activeElapsed(game: Game, now: number) {
  const end = game.phase === 'grace' && game.deadline ? Math.min(now, game.deadline) : now;
  return game.elapsedMs + (game.clockAt === null ? 0 : Math.max(0, end - game.clockAt));
}
export function startRound(game: Game, now: number) {
  requireRule(
    game.phase === 'lobby' || game.phase === 'results',
    'Finish this round before starting another.',
  );
  if (game.roundIndex + 1 >= game.quiz.songs.length) {
    game.phase = 'finished';
    return;
  }
  game.roundIndex++;
  game.phase = 'playing';
  game.runId = randomUUID();
  game.paused = false;
  game.pauseReason = null;
  game.elapsedMs = 0;
  game.clockAt = now;
  game.playbackPositionMs = 0;
  game.deadline = null;
  game.graceRemainingMs = 15000;
  game.revealEndsAt = null;
  game.heartbeatAt = now;
  game.answers[game.roundIndex] = {};
}
export function endAudio(game: Game, now: number, runId: string) {
  if (game.runId !== runId || game.phase !== 'playing' || game.paused) return;
  game.phase = 'grace';
  game.deadline = now + 15000;
  game.graceRemainingMs = 15000;
  game.playbackPositionMs = game.quiz.songs[game.roundIndex].durationMs;
  game.heartbeatAt = now;
}
export function advance(game: Game, now: number): boolean {
  if (game.paused) return false;
  if (game.phase === 'grace' && game.deadline !== null && now >= game.deadline) {
    game.elapsedMs = activeElapsed(game, game.deadline);
    game.clockAt = null;
    game.phase = 'locked';
    return true;
  }
  if (game.phase === 'revealing' && game.revealEndsAt !== null && now >= game.revealEndsAt) {
    game.phase = 'results';
    return true;
  }
  return false;
}
export function submitAnswer(game: Game, playerId: string, colleagueId: string, now: number) {
  advance(game, now);
  requireRule(!game.paused, 'The round is paused. Please wait.');
  requireRule(game.phase === 'playing' || game.phase === 'grace', 'Answers are closed.');
  requireRule(
    game.players.some((p) => p.id === playerId),
    'Player not found.',
    401,
  );
  requireRule(
    game.quiz.colleagues.some((c) => c.id === colleagueId),
    'Choose a colleague from the list.',
  );
  requireRule(!game.answers[game.roundIndex][playerId], 'You already locked an answer.');
  game.answers[game.roundIndex][playerId] = {
    colleagueId,
    elapsedMs: activeElapsed(game, now),
    submittedAt: now,
  };
}
export function reveal(game: Game, now: number) {
  advance(game, now);
  if (game.phase === 'revealing' || game.phase === 'results') return;
  requireRule(game.phase === 'locked', 'Wait until answers have closed.');
  game.phase = 'revealing';
  game.revealEndsAt = now + 5000;
}
export function pause(game: Game, now: number, reason: string) {
  advance(game, now);
  if (game.paused || (game.phase !== 'playing' && game.phase !== 'grace')) return;
  game.elapsedMs = activeElapsed(game, now);
  game.clockAt = null;
  if (game.phase === 'grace' && game.deadline !== null) {
    game.graceRemainingMs = Math.max(0, game.deadline - now);
    game.deadline = null;
  }
  game.paused = true;
  game.pauseReason = reason;
}
export function resume(game: Game, now: number) {
  requireRule(game.paused, 'The game is not paused.');
  game.paused = false;
  game.pauseReason = null;
  game.clockAt = now;
  game.runId = randomUUID();
  game.heartbeatAt = now;
  if (game.phase === 'grace') game.deadline = now + game.graceRemainingMs;
}
export function recover(game: Game, now: number) {
  // Use the last persisted playback heartbeat, never count server downtime as answering time.
  if (!game.paused && (game.phase === 'playing' || game.phase === 'grace')) {
    pause(
      game,
      Math.max(game.clockAt ?? game.heartbeatAt, game.heartbeatAt),
      'Server restarted. Reconnect the presentation screen, then resume.',
    );
  }
  game.runId = randomUUID();
  advance(game, now);
}
export function finishGame(game: Game) {
  // A round the room never saw revealed must not count or give away its answer.
  if (!['lobby', 'results', 'finished'].includes(game.phase)) {
    game.answers.splice(game.roundIndex);
    game.roundIndex--;
  }
  game.phase = 'finished';
  game.paused = false;
  game.pauseReason = null;
  game.clockAt = null;
  game.deadline = null;
  game.revealEndsAt = null;
}
export function score(correct: boolean, elapsedMs: number, totalMs: number) {
  return correct ? Math.round(1000 - 500 * Math.min(1, Math.max(0, elapsedMs / totalMs))) : 0;
}
function votes(game: Game): Vote[] {
  const song = game.quiz.songs[game.roundIndex];
  const counts = new Map<string, number>();
  for (const answer of Object.values(game.answers[game.roundIndex] ?? {}))
    counts.set(answer.colleagueId, (counts.get(answer.colleagueId) ?? 0) + 1);
  return game.quiz.colleagues
    .filter((c) => counts.has(c.id))
    .map((c) => ({
      colleagueId: c.id,
      name: c.name,
      count: counts.get(c.id)!,
      correct: c.id === song.correctColleagueId,
    }))
    .sort((a, b) => b.count - a.count || Number(b.correct) - Number(a.correct));
}
function standings(game: Game): Standing[] {
  const lastVisible = ['results', 'finished'].includes(game.phase)
    ? game.roundIndex
    : game.roundIndex - 1;
  const list = game.players
    .map((player) => {
      let total = 0;
      let roundPoints = 0;
      for (let i = 0; i <= lastVisible; i++) {
        const answer = game.answers[i]?.[player.id];
        const song = game.quiz.songs[i];
        const points = answer
          ? score(
              answer.colleagueId === song.correctColleagueId,
              answer.elapsedMs,
              song.durationMs + 15000,
            )
          : 0;
        total += points;
        if (i === game.roundIndex) roundPoints = points;
      }
      return { id: player.id, name: player.name, score: total, roundPoints, rank: 0 };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  list.forEach((p, i) => {
    p.rank = i > 0 && list[i - 1].score === p.score ? list[i - 1].rank : i + 1;
  });
  return list;
}
export function project(
  game: Game,
  role: Role,
  playerId: string | undefined,
  now: number,
): GameView {
  const song = game.quiz.songs[game.roundIndex];
  const answer = playerId ? game.answers[game.roundIndex]?.[playerId] : undefined;
  const view: GameView = {
    roomCode: game.roomCode,
    title: game.quiz.title,
    phase: game.phase,
    roundIndex: game.roundIndex,
    totalRounds: game.quiz.songs.length,
    runId: game.runId,
    paused: game.paused,
    pauseReason: game.pauseReason,
    serverNow: now,
    colleagues: game.quiz.colleagues,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: false,
      ...(role === 'host' && { answered: Boolean(game.answers[game.roundIndex]?.[p.id]) }),
    })),
    answerCount: Object.keys(game.answers[game.roundIndex] ?? {}).length,
    standings: standings(game),
    deadline: game.deadline,
    revealEndsAt: game.revealEndsAt,
  };
  if (playerId) view.playerId = playerId;
  if (song && game.phase !== 'finished') view.lyrics = song.lyrics;
  if (answer) view.myAnswer = { colleagueId: answer.colleagueId };
  if (song && ['revealing', 'results', 'finished'].includes(game.phase)) {
    view.imageUrl = `/api/games/${game.roomCode}/image`;
  }
  if (song && game.phase === 'results') view.votes = votes(game);
  if (song && ['results', 'finished'].includes(game.phase)) {
    view.correctName = game.quiz.colleagues.find((c) => c.id === song.correctColleagueId)?.name;
    if (playerId)
      view.myResult = {
        correct: answer?.colleagueId === song.correctColleagueId,
        points: view.standings.find((p) => p.id === playerId)?.roundPoints ?? 0,
      };
  }
  if (role === 'host') {
    view.nextSongTitle = game.quiz.songs[game.roundIndex + 1]?.title;
    if (song && game.phase !== 'finished') {
      view.currentSongTitle = song.title;
      view.audioDurationMs = song.durationMs;
      view.playbackPositionMs = game.playbackPositionMs;
      view.playbackAt = game.heartbeatAt;
    }
  }
  if (role === 'screen' && game.phase !== 'finished') {
    const audioSong = ['lobby', 'results'].includes(game.phase)
      ? game.quiz.songs[game.roundIndex + 1]
      : song;
    if (audioSong) {
      view.audioUrl = `/api/games/${game.roomCode}/audio/${audioSong.id}`;
      view.audioSongId = audioSong.id;
      view.audioDurationMs = audioSong.durationMs;
      view.playbackPositionMs = ['lobby', 'results'].includes(game.phase)
        ? 0
        : game.playbackPositionMs;
    }
  }
  return view;
}
