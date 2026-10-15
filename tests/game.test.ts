import { describe, expect, it } from 'vitest';
import {
  createGame,
  joinGame,
  startRound,
  endAudio,
  submitAnswer,
  advance,
  reveal,
  pause,
  resume,
  project,
  recover,
  score,
} from '../server/game';
import type { Quiz } from '../shared/types';

export const quiz: Quiz = {
  title: 'The colleagues sessions',
  colleagues: [
    { id: 'alex', name: 'Alex' },
    { id: 'sam', name: 'Sam' },
  ],
  songs: [
    {
      id: 'song1',
      title: 'Secret title',
      lyrics: 'A song about somebody else',
      audioId: 'audio1',
      imageId: 'image1',
      durationMs: 60000,
      correctColleagueId: 'sam',
    },
  ],
};
function playing() {
  const game = createGame(quiz, 'ABC123', 0);
  joinGame(game, 'p1', 'token1', 'Player One');
  startRound(game, 1000);
  return game;
}

describe('live quiz rules', () => {
  it('scores correct answers from 1000 to 500 and wrong answers as zero', () => {
    expect(score(true, 0, 75000)).toBe(1000);
    expect(score(true, 37500, 75000)).toBe(750);
    expect(score(true, 75000, 75000)).toBe(500);
    expect(score(false, 0, 75000)).toBe(0);
  });
  it('locks answers exactly 15 seconds after the audio actually ends', () => {
    const game = playing();
    endAudio(game, 62000, game.runId);
    expect(game.phase).toBe('grace');
    expect(game.deadline).toBe(77000);
    submitAnswer(game, 'p1', 'sam', 76999);
    expect(game.answers[0].p1.colleagueId).toBe('sam');
    advance(game, 77000);
    expect(game.phase).toBe('locked');
  });
  it('rejects late and repeat guesses even if the timer has not ticked yet', () => {
    const game = playing();
    submitAnswer(game, 'p1', 'sam', 2000);
    expect(() => submitAnswer(game, 'p1', 'alex', 3000)).toThrow(/already/i);
    const late = playing();
    endAudio(late, 61000, late.runId);
    expect(() => submitAnswer(late, 'p1', 'sam', 76000)).toThrow(/closed/i);
  });
  it('withholds answer, picture, other guesses, and current-round scores until reveal completes', () => {
    const game = playing();
    submitAnswer(game, 'p1', 'sam', 1000);
    const snapshot = project(game, 'player', 'p1', 2000);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('Secret title');
    expect(serialized).not.toContain('image1');
    expect(snapshot.correctName).toBeUndefined();
    expect(snapshot.standings[0].score).toBe(0);
    expect(snapshot.myAnswer).toEqual({ colleagueId: 'sam' });
    endAudio(game, 61000, game.runId);
    advance(game, 76000);
    reveal(game, 80000);
    expect(project(game, 'screen', undefined, 81000).imageUrl).toContain('/image');
    expect(project(game, 'screen', undefined, 81000).correctName).toBeUndefined();
    advance(game, 85000);
    expect(project(game, 'player', 'p1', 85000).correctName).toBe('Sam');
    expect(project(game, 'player', 'p1', 85000).standings[0].score).toBe(1000);
  });
  it('freezes scoring and rejects answers while paused, and invalidates old playback events', () => {
    const game = playing();
    const oldRun = game.runId;
    pause(game, 11000, 'Audio disconnected');
    expect(() => submitAnswer(game, 'p1', 'sam', 12000)).toThrow(/paused/i);
    resume(game, 101000);
    expect(game.runId).not.toBe(oldRun);
    endAudio(game, 102000, oldRun);
    expect(game.phase).toBe('playing');
    submitAnswer(game, 'p1', 'sam', 101000);
    expect(game.answers[0].p1.elapsedMs).toBe(10000);
  });
  it('preserves the remainder of the grace period over pause and resume', () => {
    const game = playing();
    endAudio(game, 61000, game.runId);
    pause(game, 66000, 'Screen disconnected');
    resume(game, 100000);
    expect(game.deadline).toBe(110000);
    advance(game, 109999);
    expect(game.phase).toBe('grace');
    advance(game, 110000);
    expect(game.phase).toBe('locked');
  });
  it('keeps the game snapshot separate from later editor changes', () => {
    const draft = structuredClone(quiz);
    const game = createGame(draft, 'ABC123', 0);
    draft.songs[0].correctColleagueId = 'alex';
    expect(game.quiz.songs[0].correctColleagueId).toBe('sam');
  });
  it('caps players at 15 and disallows late joins', () => {
    const game = createGame(quiz, 'ABC123', 0);
    for (let i = 0; i < 15; i++) joinGame(game, `p${i}`, `t${i}`, `Player ${i}`);
    expect(() => joinGame(game, 'p16', 't16', 'Too late')).toThrow(/full/i);
    startRound(game, 1000);
    expect(() => joinGame(game, 'p17', 't17', 'Late')).toThrow(/started/i);
  });
  it('recovers an interrupted round paused with answers retained', () => {
    const game = playing();
    submitAnswer(game, 'p1', 'sam', 2000);
    game.playbackPositionMs = 5000;
    recover(game, 900000);
    expect(game.paused).toBe(true);
    expect(game.answers[0].p1.colleagueId).toBe('sam');
    expect(game.clockAt).toBeNull();
  });
  it('assigns equal ranks for equal totals and finishes after the last result', () => {
    const game = createGame(quiz, 'ABC123', 0);
    joinGame(game, 'p1', 't1', 'One');
    joinGame(game, 'p2', 't2', 'Two');
    startRound(game, 1000);
    endAudio(game, 61000, game.runId);
    advance(game, 76000);
    reveal(game, 80000);
    advance(game, 85000);
    const standings = project(game, 'screen', undefined, 85000).standings;
    expect(standings.map((p) => p.rank)).toEqual([1, 1]);
    startRound(game, 90000);
    expect(game.phase).toBe('finished');
  });
});
