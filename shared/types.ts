export interface Colleague {
  id: string;
  name: string;
}
export interface Song {
  id: string;
  title: string;
  lyrics: string;
  audioId: string;
  imageId: string;
  durationMs: number;
  correctColleagueId: string;
}
export interface Quiz {
  title: string;
  colleagues: Colleague[];
  songs: Song[];
}
export type Phase = 'lobby' | 'playing' | 'grace' | 'locked' | 'revealing' | 'results' | 'finished';
export interface Player {
  id: string;
  token: string;
  name: string;
}
export interface Answer {
  colleagueId: string;
  elapsedMs: number;
  submittedAt: number;
}
export interface Game {
  roomCode: string;
  quiz: Quiz;
  phase: Phase;
  roundIndex: number;
  runId: string;
  createdAt: number;
  players: Player[];
  answers: Record<string, Answer>[];
  paused: boolean;
  pauseReason: string | null;
  elapsedMs: number;
  clockAt: number | null;
  playbackPositionMs: number;
  deadline: number | null;
  graceRemainingMs: number;
  revealEndsAt: number | null;
  heartbeatAt: number;
}
export interface Standing {
  id: string;
  name: string;
  rank: number;
  score: number;
  roundPoints: number;
}
export interface Vote {
  colleagueId: string;
  name: string;
  count: number;
  correct: boolean;
}
export interface GameView {
  roomCode: string;
  title: string;
  phase: Phase;
  roundIndex: number;
  totalRounds: number;
  runId: string;
  paused: boolean;
  pauseReason: string | null;
  serverNow: number;
  lyrics?: string;
  colleagues: Colleague[];
  players: { id: string; name: string; connected: boolean; answered?: boolean }[];
  answerCount: number;
  standings: Standing[];
  myAnswer?: { colleagueId: string };
  myResult?: { correct: boolean; points: number };
  playerId?: string;
  deadline: number | null;
  revealEndsAt: number | null;
  imageUrl?: string;
  correctName?: string;
  audioUrl?: string;
  audioSongId?: string;
  audioDurationMs?: number;
  playbackPositionMs?: number;
  playbackAt?: number;
  currentSongTitle?: string;
  votes?: Vote[];
  screenConnected?: boolean;
  screenReady?: boolean;
  nextSongTitle?: string;
}
export type Role = 'host' | 'screen' | 'player';
export interface AppState {
  schemaVersion: 1;
  revision: number;
  quiz: Quiz;
  game: Game | null;
  commandIds?: string[];
}
export interface AssetInfo {
  id: string;
  kind: 'audio' | 'image';
  contentType: string;
  size: number;
  durationMs?: number;
}
export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
