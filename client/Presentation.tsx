import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Expand, Headphones, Music2, Trophy, Users, Volume2 } from 'lucide-react';
import {
  Badge,
  Brand,
  ConnectionNotice,
  Countdown,
  Equalizer,
  ErrorNotice,
  FittedLyrics,
  leads,
  QR,
  Reveal,
  RoundTag,
  Standings,
  Votes,
} from './components';
import { useGame, useNow } from './useGame';

export function Presentation({ roomCode }: { roomCode: string }) {
  const live = useGame('screen', roomCode);
  const { state, emit, connected } = live;
  const now = useNow(live.offset, state?.phase === 'grace' || state?.phase === 'revealing');
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const current = useRef(state);
  current.current = state;
  const generation = useRef(0);
  useEffect(() => {
    // A readiness error about the previous song no longer applies.
    setLoaded(false);
    setError('');
  }, [state?.audioUrl]);
  async function ready() {
    if (
      !audio.current ||
      !current.current?.audioSongId ||
      !connected ||
      !enabled ||
      audio.current.readyState < 3
    )
      return;
    try {
      await emit('screen:ready', {
        songId: current.current.audioSongId,
        durationMs: audio.current.duration * 1000,
      });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (loaded && enabled && connected) void ready();
  }, [loaded, enabled, connected, state?.audioSongId]);
  async function enable() {
    const element = audio.current;
    if (!element) return;
    setError('');
    try {
      // A user gesture unlocks this same audio element for host-controlled playback.
      element.muted = true;
      await element.play();
      element.pause();
      element.muted = false;
      element.currentTime = (current.current?.playbackPositionMs ?? 0) / 1000;
      setEnabled(true);
      setLoaded(element.readyState >= 3);
    } catch {
      element.muted = false;
      setError('Audio is still loading. Check the speakers and try again.');
    }
  }
  useEffect(() => {
    const element = audio.current;
    if (!element || !state) return;
    const id = ++generation.current;
    if (state.phase === 'playing' && !state.paused && connected && enabled) {
      element.currentTime = (state.playbackPositionMs ?? 0) / 1000;
      element.play().catch(() => {
        if (id !== generation.current) return;
        setEnabled(false);
        setError('Playback was blocked. Enable room audio, then ask the host to resume.');
        emit('playback', {
          event: 'error',
          runId: state.runId,
          positionMs: element.currentTime * 1000,
        }).catch(() => {});
      });
    } else element.pause();
    return () => {
      generation.current++;
      element.pause();
    };
  }, [state?.phase, state?.runId, state?.paused, state?.audioUrl, connected, enabled]);
  useEffect(() => {
    if (!connected || !enabled || state?.phase !== 'playing' || state.paused) return;
    const interval = setInterval(() => {
      const currentState = current.current;
      const element = audio.current;
      if (!currentState || !element || element.paused || element.ended) return;
      emit('playback', {
        event: 'progress',
        runId: currentState.runId,
        positionMs: element.currentTime * 1000,
      }).catch((e) => setError((e as Error).message));
    }, 1500);
    return () => clearInterval(interval);
  }, [connected, enabled, state?.phase, state?.paused, state?.runId]);
  function ended() {
    const snapshot = current.current;
    if (!snapshot || snapshot.paused || snapshot.phase !== 'playing') return;
    emit('playback', {
      event: 'ended',
      runId: snapshot.runId,
      positionMs: audio.current!.currentTime * 1000,
    }).catch((e) => setError((e as Error).message));
  }
  function audioError() {
    setLoaded(false);
    setEnabled(false);
    setError('Could not load the audio. Check the connection and reload the presentation.');
    const snapshot = current.current;
    if (snapshot?.phase === 'playing' && !snapshot.paused)
      emit('playback', {
        event: 'error',
        runId: snapshot.runId,
        positionMs: audio.current?.currentTime ? audio.current.currentTime * 1000 : 0,
      }).catch(() => {});
  }
  const joinUrl = `${location.origin}/join/${roomCode}`;
  const inRound = Boolean(state && !['lobby', 'finished'].includes(state.phase));
  const crowded = (state?.standings.length ?? 0) > 8;
  return (
    <div className={`presentation-shell ${inRound ? 'is-round' : ''}`}>
      <header className="presentation-header">
        <Brand />
        <div className="presentation-meta">
          <Badge live={connected}>{connected ? 'LIVE IN THE ROOM' : 'CONNECTING'}</Badge>
          <button
            className="icon-button"
            aria-label="Enter fullscreen"
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          >
            <Expand size={18} />
          </button>
        </div>
      </header>
      <ConnectionNotice connected={connected} error={live.error} />
      {live.error.includes('Host') || live.error.includes('host') || live.closed ? (
        <div className="screen-access">
          <h1>Backstage pass required.</h1>
          <p>Sign in as the host in this browser, then reopen the presentation.</p>
          <a className="button button-primary" href="/host">
            Open host panel <ArrowUpRight size={16} />
          </a>
        </div>
      ) : !state ? (
        <div className="screen-access">
          <Equalizer large />
          <h2>Finding the room…</h2>
          <ErrorNotice message={live.error} />
        </div>
      ) : (
        <>
          <audio
            ref={audio}
            src={state.audioUrl}
            preload="auto"
            onCanPlay={() => setLoaded(true)}
            onEnded={ended}
            onError={audioError}
          />
          {state.audioUrl && !enabled && (
            <div className="audio-enable">
              <Volume2 size={20} />
              <div>
                <strong>Give the room a sound check.</strong>
                <span>Connect your speakers, then enable audio before the host starts.</span>
              </div>
              <button
                className="button button-primary"
                disabled={!loaded || !connected}
                onClick={enable}
              >
                Enable room audio <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          <ErrorNotice message={error} />
          {state.paused && (
            <div className="notice paused-notice">
              <strong>A little intermission.</strong>
              <span>{state.pauseReason}</span>
            </div>
          )}
          {state.phase === 'lobby' ? (
            <main className="screen-lobby">
              <div className="screen-lobby-copy">
                <span className="eyebrow">
                  <Headphones size={18} /> A LISTENING PARTY WITH A TWIST
                </span>
                <h1>
                  You know
                  <br />
                  these people.
                  <br />
                  <em>Or do you?</em>
                </h1>
                <p>
                  Listen closely. Read between the lyrics.
                  <br />
                  Find the colleague behind the song.
                </p>
                <div className="screen-lobby-stats">
                  <span>
                    <Music2 size={19} />
                    {state.totalRounds} mystery tracks
                  </span>
                  <span>
                    <Users size={19} />
                    {state.players.length} / 15 detectives
                  </span>
                </div>
                <div className="screen-guest-list">
                  {state.players.map((p) => (
                    <span key={p.id}>{p.name}</span>
                  ))}
                </div>
              </div>
              <div className="screen-invite">
                <span className="eyebrow">YOUR PHONE IS YOUR BACKSTAGE PASS</span>
                <QR value={joinUrl} />
                <h2>Scan to join the room.</h2>
                <p className="muted">
                  Or head to <strong>{location.host}</strong> and enter
                </p>
                <strong className="screen-room-code">{roomCode}</strong>
                <span className="screen-invite-note">No app. No account. Just a good hunch.</span>
              </div>
            </main>
          ) : state.phase === 'finished' ? (
            <main className="screen-finale">
              <span className="eyebrow">THE FINAL PRESSING</span>
              <h1>
                That’s a wrap<span className="accent">.</span>
              </h1>
              <p className="muted">A round of applause for the sharpest ears in the room.</p>
              <div className="podium">
                {state.standings.slice(0, 3).map((p, i) => (
                  <div className={`podium-place podium-${i}`} key={p.id}>
                    <span>{leads(p) ? <Trophy size={32} /> : String(p.rank).padStart(2, '0')}</span>
                    <h2>{p.name}</h2>
                    <strong>
                      {p.score.toLocaleString()}
                      <small>POINTS</small>
                    </strong>
                  </div>
                ))}
              </div>
              <Standings standings={state.standings} columns={crowded} />
            </main>
          ) : (
            <main className="screen-round">
              <div className="screen-round-bar">
                <RoundTag state={state} />
                <span>
                  {state.answerCount} OF {state.players.length} GUESSES LOCKED
                </span>
              </div>
              {['playing', 'grace', 'locked'].includes(state.phase) ? (
                <>
                  <div className="screen-song-heading">
                    <div>
                      <span className="eyebrow">A FAMILIAR NAME. A DIFFERENT STORY.</span>
                      <h1>Who’s this really about?</h1>
                    </div>
                    {state.phase === 'playing' && !state.paused && <Equalizer large />}
                  </div>
                  <div className="screen-lyrics-panel">
                    <span className="lyrics-label">
                      <Music2 size={16} />
                      THE LYRICS
                    </span>
                    <FittedLyrics text={state.lyrics ?? ''} />
                  </div>
                  <div className="screen-round-bottom">
                    {state.phase === 'grace' ? (
                      <Countdown state={state} now={now} />
                    ) : state.phase === 'locked' ? (
                      <div className="screen-locked">
                        <span className="eyebrow">THE GUESSES ARE IN</span>
                        <h2>Some secrets are worth waiting for.</h2>
                        <p className="muted">Your host will reveal the colleague.</p>
                      </div>
                    ) : (
                      <>
                        <span className="now-playing">
                          <Equalizer />
                          {state.paused ? 'INTERMISSION' : 'NOW PLAYING'}
                        </span>
                        <p>Trust the lyrics. Not the names.</p>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className={`screen-results ${state.phase === 'revealing' ? 'reveal-only' : ''} ${crowded ? 'is-crowded' : ''}`}
                >
                  <div className="screen-reveal-column">
                    <Reveal state={state} now={now} />
                    <Votes votes={state.votes} />
                  </div>
                  {state.phase === 'results' && (
                    <section className="screen-scoreboard">
                      <div className="scoreboard-heading">
                        <span className="eyebrow">THE ROOM SO FAR</span>
                        <h2>On the leaderboard.</h2>
                      </div>
                      <Standings standings={state.standings} columns={crowded} />
                    </section>
                  )}
                </div>
              )}
            </main>
          )}
        </>
      )}
      <footer className="presentation-footer">
        <span>ORIGINAL SONGS. FAMILIAR FACES.</span>
        <span>
          OFF THE RECORD <span className="accent">/</span>{' '}
          {state?.title || 'THE COLLEAGUE MUSIC QUIZ'}
        </span>
      </footer>
    </div>
  );
}
