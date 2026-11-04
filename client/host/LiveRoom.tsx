import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ListMusic,
  LoaderCircle,
  Monitor,
  Pause,
  Play,
  Radio,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { GameView } from '../../shared/types';
import { api } from '../api';
import { Badge, Countdown, QR, Standings, Votes } from '../components';

const clock = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** Where the song is now, extrapolated from the presentation's last heartbeat. */
function playbackPosition(game: GameView, now: number) {
  const duration = game.audioDurationMs ?? 0;
  if (game.phase !== 'playing') return duration;
  const moving = game.paused ? 0 : Math.max(0, now - (game.playbackAt ?? now));
  return Math.min(duration, (game.playbackPositionMs ?? 0) + moving);
}

export function LiveRoom({
  game,
  connected,
  now,
  busy,
  command,
  onError,
  onBackToStudio,
}: {
  game: GameView;
  connected: boolean;
  now: number;
  busy: boolean;
  command: (name: string) => void;
  onError: (message: string) => void;
  onBackToStudio: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const inRound = !['lobby', 'finished'].includes(game.phase);
  const joinUrl = `${location.origin}/join/${game.roomCode}`;
  async function removePlayer(id: string, name: string) {
    if (!confirm(`Remove ${name} from the room?`)) return;
    onError('');
    try {
      await api(`/api/game/players/${id}`, { method: 'DELETE' });
    } catch (e) {
      onError((e as Error).message);
    }
  }
  const position = playbackPosition(game, now);
  return (
    <main className="live-host">
      <div className="studio-heading">
        <div>
          <span className="eyebrow">YOU’RE IN CONTROL</span>
          <h1>
            {game.phase === 'lobby'
              ? 'The room is yours'
              : game.phase === 'finished'
                ? 'What a good night.'
                : 'Keep the room guessing'}
            <span className="accent">.</span>
          </h1>
          <p className="muted">
            {game.phase === 'lobby'
              ? 'Open the presentation, turn up the speakers, and invite your people.'
              : 'Watch the room. Take your time. You decide what comes next.'}
          </p>
        </div>
        <Badge live={connected}>{connected ? 'LIVE CONNECTION' : 'RECONNECTING'}</Badge>
      </div>
      <div className="live-grid">
        <section className="panel control-panel">
          <div className="panel-title">
            <span>
              <Radio size={16} />
              SHOW CONTROLS
            </span>
            <span className="muted">ROOM {game.roomCode}</span>
          </div>
          <div className="host-status">
            <span className="eyebrow">
              {game.phase === 'lobby'
                ? 'BEFORE THE FIRST NOTE'
                : game.phase === 'finished'
                  ? 'THE FINAL STANDINGS'
                  : `TRACK ${game.roundIndex + 1} OF ${game.totalRounds}`}
            </span>
            <h2>
              {game.paused
                ? 'Taking a breather.'
                : {
                    lobby: 'Ready when you are.',
                    playing: 'Let the music play.',
                    grace: 'One last chance.',
                    locked: 'The guesses are in.',
                    revealing: 'A familiar face appears.',
                    results: 'The truth is out.',
                    finished: 'That’s a wrap.',
                  }[game.phase]}
            </h2>
            {game.paused ? (
              <p className="muted">{game.pauseReason}</p>
            ) : game.phase === 'lobby' ? (
              <p className="muted">Next up: {game.nextSongTitle}</p>
            ) : game.phase === 'playing' ? (
              <p className="muted">Players are listening and reading the lyrics.</p>
            ) : game.phase === 'locked' ? (
              <p className="muted">Build the suspense. Reveal the colleague when you’re ready.</p>
            ) : game.phase === 'results' ? (
              <p className="muted">
                {game.nextSongTitle
                  ? `Next up: ${game.nextSongTitle}`
                  : 'That was the final song. Time for the podium.'}
              </p>
            ) : null}
            {inRound && game.currentSongTitle && (
              <div className="now-track">
                <div>
                  <span>NOW ON THE RECORD</span>
                  <strong>{game.currentSongTitle}</strong>
                </div>
                <div
                  className="track-progress"
                  role="progressbar"
                  aria-label="Song progress"
                  aria-valuemin={0}
                  aria-valuemax={game.audioDurationMs}
                  aria-valuenow={Math.round(position)}
                >
                  <i style={{ width: `${(100 * position) / (game.audioDurationMs || 1)}%` }} />
                </div>
                <small>
                  {clock(position)} / {clock(game.audioDurationMs ?? 0)}
                </small>
              </div>
            )}
          </div>
          <Countdown state={game} now={now} />
          <div className="live-metrics">
            <div>
              <strong>
                {game.players.length}
                <small>/15</small>
              </strong>
              <span>IN THE ROOM</span>
            </div>
            <div>
              <strong>
                {game.answerCount}
                <small>/{game.players.length}</small>
              </strong>
              <span>GUESSES LOCKED</span>
            </div>
          </div>
          {['playing', 'grace', 'locked'].includes(game.phase) && (
            <div className="player-chips answer-chips" aria-label="Who has guessed">
              {game.players.map((p) => (
                <span key={p.id} className={p.answered ? 'answered' : ''}>
                  {p.answered ? <Check size={12} /> : <span className="status-dot" />}
                  {p.name}
                </span>
              ))}
            </div>
          )}
          <div className="control-buttons">
            {game.paused ? (
              <button
                className="button button-primary button-full"
                disabled={busy || !game.screenReady || !connected}
                onClick={() => command('resume')}
              >
                <Play size={17} />
                Resume round
              </button>
            ) : game.phase === 'lobby' ? (
              <button
                className="button button-primary button-full"
                disabled={busy || !game.screenReady || !game.players.length || !connected}
                onClick={() => command('start')}
              >
                <Play size={17} />
                Start first song
              </button>
            ) : game.phase === 'locked' ? (
              <button
                className="button button-primary button-full"
                disabled={busy || !connected}
                onClick={() => command('reveal')}
              >
                <Sparkles size={17} />
                Reveal the colleague
              </button>
            ) : game.phase === 'results' ? (
              <button
                className="button button-primary button-full"
                disabled={
                  busy ||
                  !connected ||
                  (game.roundIndex + 1 < game.totalRounds && !game.screenReady)
                }
                onClick={() => command('start')}
              >
                <ArrowRight size={17} />
                {game.roundIndex + 1 < game.totalRounds
                  ? 'Start next song'
                  : 'Show final standings'}
              </button>
            ) : ['playing', 'grace'].includes(game.phase) ? (
              <button
                className="button button-secondary button-full"
                disabled={busy || !connected}
                onClick={() => command('pause')}
              >
                <Pause size={17} />
                Pause round
              </button>
            ) : game.phase === 'finished' ? (
              <button className="button button-secondary button-full" onClick={onBackToStudio}>
                <ListMusic size={17} />
                Back to the studio
              </button>
            ) : (
              <button className="button button-secondary button-full" disabled>
                <LoaderCircle size={17} className="spin" />
                The reveal is rolling
              </button>
            )}
            <a
              className="button button-secondary button-full"
              href={`/screen/${game.roomCode}`}
              target="_blank"
              rel="noreferrer"
            >
              <Monitor size={17} />
              Open presentation
              <ArrowUpRight size={16} />
            </a>
            <div className={`presentation-status ${game.screenReady ? 'is-ready' : ''}`}>
              <span className="status-dot" />
              {game.screenReady
                ? 'Presentation ready'
                : game.screenConnected
                  ? 'Enable audio on the presentation screen'
                  : 'Waiting for the presentation screen'}
            </div>
          </div>
          {inRound && (
            <button
              className="text-button end-game"
              onClick={() => {
                if (
                  confirm(
                    game.phase === 'results'
                      ? 'End this game now and show the final standings?'
                      : 'End this game now? The current song won’t count and the final standings appear for everyone.',
                  )
                )
                  command('finish');
              }}
            >
              End game early
            </button>
          )}
        </section>
        <section className="panel host-invite">
          <div className="panel-title">
            <span>
              <Users size={16} />
              {game.phase === 'lobby' ? 'THE GUEST LIST' : 'THE STANDINGS'}
            </span>
            <span className="muted">
              {game.players.filter((p) => p.connected).length} CONNECTED
            </span>
          </div>
          {game.phase === 'lobby' ? (
            <>
              <div className="invite-row">
                <QR value={joinUrl} />
                <div>
                  <span className="eyebrow">SCAN. JOIN. START SPECULATING.</span>
                  <strong className="room-code">{game.roomCode}</strong>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(joinUrl);
                        setCopied(true);
                      } catch {
                        onError('Copy the join link from the presentation screen.');
                      }
                    }}
                  >
                    Copy invite link <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
              {copied && <p className="upload-success">Invite link copied</p>}
              <div className="player-chips">
                {game.players.map((p) => (
                  <span key={p.id} className={p.connected ? 'connected' : ''}>
                    <span className="status-dot" />
                    {p.name}
                    <button
                      className="chip-remove"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => removePlayer(p.id, p.name)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              {!game.players.length && (
                <div className="waiting-guests">
                  <Users size={25} />
                  <p>
                    Your people will appear here.
                    <br />
                    <span className="muted">Share the code or let them scan the big screen.</span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <Votes votes={game.votes} />
              <Standings standings={game.standings} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
