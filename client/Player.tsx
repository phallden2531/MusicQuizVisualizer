import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Headphones,
  LockKeyhole,
  Music2,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { api, json } from './api';
import {
  Badge,
  Brand,
  ConnectionNotice,
  Countdown,
  Equalizer,
  ErrorNotice,
  Reveal,
  RoundTag,
  Standings,
  Votes,
} from './components';
import { useGame, useNow } from './useGame';

export function Player({ roomCode }: { roomCode: string }) {
  const key = `off-the-record:${roomCode}`;
  const [identity, setIdentity] = useState<{ id: string; token: string; name: string } | null>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        return null;
      }
    },
  );
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const live = useGame('player', roomCode, identity?.token, Boolean(identity));
  const state = live.state;
  const now = useNow(live.offset, state?.phase === 'grace' || state?.phase === 'revealing');
  useEffect(() => {
    setSelected('');
    setSearch('');
    setError('');
  }, [state?.roundIndex]);
  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const player = await api<{ id: string; token: string; name: string }>(
        `/api/games/${roomCode}/join`,
        { method: 'POST', body: json({ name }) },
      );
      localStorage.setItem(key, json(player));
      setIdentity(player);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function answer() {
    if (!state || !selected) return;
    setBusy(true);
    setError('');
    try {
      await live.emit('answer', { colleagueId: selected, runId: state.runId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function resetIdentity() {
    localStorage.removeItem(key);
    setIdentity(null);
  }
  const answering = state && ['playing', 'grace'].includes(state.phase);
  const canPick = answering && !state.myAnswer;
  // In the last call the guess matters more than rereading; fold the lyrics away.
  const lastCall = canPick && state.phase === 'grace';
  const lockedName = state?.colleagues.find((c) => c.id === state.myAnswer?.colleagueId)?.name;
  const selectedName = state?.colleagues.find((c) => c.id === selected)?.name;
  return (
    <div className="player-shell">
      <header className="player-header">
        <Brand small />
        <span className="player-room">
          ROOM <strong>{roomCode}</strong>
        </span>
      </header>
      {!identity ? (
        <main className="player-join">
          <span className="ticket-icon">
            <Headphones size={32} />
          </span>
          <span className="eyebrow">YOUR NAME’S ON THE LIST</span>
          <h1>
            Good ears.
            <br />
            <em>Better instincts.</em>
          </h1>
          <p className="muted">
            Listen to the song, read between the lines,
            <br />
            and find the colleague behind the lyrics.
          </p>
          <form onSubmit={join}>
            <label htmlFor="nickname">Your nickname</label>
            <input
              id="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              maxLength={30}
              autoComplete="nickname"
              required
            />
            <ErrorNotice message={error} />
            <button className="button button-primary button-full" disabled={busy || !name.trim()}>
              Join the room <ArrowRight size={18} />
            </button>
          </form>
          <div className="player-join-note">
            <LockKeyhole size={13} />
            One guess per song. Make it count.
          </div>
        </main>
      ) : (
        <>
          <ConnectionNotice connected={live.connected} error={live.error} />
          {live.closed || live.error.includes('join this game') ? (
            <div className="player-centered">
              <h2>This record has stopped.</h2>
              <p className="muted">{live.error}</p>
              <button className="button button-primary" onClick={resetIdentity}>
                Join again
              </button>
              <a className="text-link" href="/">
                Enter a new room code
              </a>
            </div>
          ) : !state ? (
            <div className="player-centered">
              <Equalizer />
              <p className="muted">Finding your room…</p>
            </div>
          ) : state.phase === 'lobby' ? (
            <main className="player-lobby">
              <Badge live>YOU’RE IN</Badge>
              <div className="lobby-record">
                <Music2 size={42} />
              </div>
              <h1>
                You’re on the
                <br />
                guest list<span className="accent">.</span>
              </h1>
              <p className="muted">
                Hey {identity.name}. Get comfortable.
                <br />
                The host will drop the first track soon.
              </p>
              <div className="lobby-info">
                <span>
                  <Users size={17} />
                  {state.players.length} music detectives
                </span>
                <span>
                  <Music2 size={17} />
                  {state.totalRounds} mystery tracks
                </span>
              </div>
              <div className="how-to">
                <span className="eyebrow">HERE’S THE TWIST</span>
                <p>
                  The name in the song is a red herring.
                  <br />
                  The lyrics describe someone else.
                </p>
                <div>
                  <span>01</span>Listen & read the lyrics
                </div>
                <div>
                  <span>02</span>Choose the real colleague
                </div>
                <div>
                  <span>03</span>Lock your guess. Earlier earns more.
                </div>
              </div>
              <div className="player-identity">
                <CheckCircle2 size={16} />
                Playing as <strong>{identity.name}</strong>
              </div>
            </main>
          ) : state.phase === 'finished' ? (
            <main className="player-finale">
              <Trophy size={40} className="accent" />
              <span className="eyebrow">THE FINAL STANDINGS</span>
              <h1>That’s a wrap.</h1>
              <p className="muted">Good songs. Great company. A few surprises.</p>
              <Standings standings={state.standings} playerId={identity.id} />
              <a className="button button-secondary button-full" href="/">
                Back to the record shop <ArrowRight size={16} />
              </a>
            </main>
          ) : (
            <main className="player-round">
              <div className="round-top">
                <RoundTag state={state} />
                {state.phase === 'playing' && !state.paused && (
                  <span className="now-playing">
                    <Equalizer />
                    NOW PLAYING
                  </span>
                )}
              </div>
              {state.paused && (
                <div className="notice paused-notice">
                  <strong>A little intermission.</strong>
                  <span>
                    {state.myAnswer
                      ? 'The host will resume shortly. Your guess is safe.'
                      : answering
                        ? 'The host will resume shortly. You can still guess after that.'
                        : 'The host will resume shortly.'}
                  </span>
                </div>
              )}
              <Countdown state={state} now={now} />
              {answering || state.phase === 'locked' ? (
                <>
                  <div className="player-round-heading">
                    <span className="eyebrow">A FAMILIAR NAME. A DIFFERENT PERSON.</span>
                    <h1>
                      Who’s this
                      <br />
                      really about?
                    </h1>
                  </div>
                  <details className="lyrics-card" open={!lastCall} key={String(lastCall)}>
                    <summary className="lyrics-label">
                      <Music2 size={14} />
                      {lastCall ? 'SHOW THE LYRICS AGAIN' : 'THE LYRICS'}
                    </summary>
                    <div className="lyrics-text">{state.lyrics}</div>
                  </details>
                  {state.myAnswer ? (
                    <div className="guess-locked">
                      <span className="locked-icon">
                        <Check size={22} />
                      </span>
                      <div>
                        <strong>Your guess is locked</strong>
                        <span>{lockedName} is on your record.</span>
                      </div>
                      <LockKeyhole size={17} />
                    </div>
                  ) : state.phase === 'locked' ? (
                    <div className="notice">
                      <LockKeyhole size={18} />
                      <span>The answering window has closed.</span>
                    </div>
                  ) : (
                    <section className="answer-picker">
                      <h2>The usual suspects</h2>
                      <p className="muted">Choose one. Trust your instincts.</p>
                      {state.colleagues.length > 6 && (
                        <div className="search-field">
                          <Search size={16} />
                          <input
                            aria-label="Search colleagues"
                            placeholder="Find a colleague"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="suspect-grid">
                        {state.colleagues
                          .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c.id}
                              aria-pressed={selected === c.id}
                              className={`suspect ${selected === c.id ? 'is-selected' : ''}`}
                              disabled={state.paused || !live.connected}
                              onClick={() => setSelected(c.id)}
                            >
                              <span className="suspect-initial" aria-hidden="true">
                                {c.name.slice(0, 1)}
                              </span>
                              <span>{c.name}</span>
                              {selected === c.id && <Check size={16} />}
                            </button>
                          ))}
                      </div>
                      <ErrorNotice message={error} />
                    </section>
                  )}
                  {canPick && (
                    <div className="lock-action">
                      <button
                        className="button button-primary button-full"
                        disabled={!selected || busy || state.paused || !live.connected}
                        onClick={answer}
                      >
                        <LockKeyhole size={16} />
                        {selectedName ? `Lock in ${selectedName}` : 'Pick a colleague below'}
                      </button>
                      <small>One shot per song. Earlier correct guesses earn more.</small>
                    </div>
                  )}
                  {state.phase === 'locked' && (
                    <div className="waiting-reveal">
                      <span className="eyebrow">ALL GUESSES ARE IN</span>
                      <h2>Waiting for the big reveal</h2>
                      <p className="muted">The host has one more secret to share.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Reveal state={state} now={now} />
                  {state.phase === 'results' && (
                    <>
                      <div
                        className={`personal-result ${state.myResult?.correct ? 'is-correct' : ''}`}
                      >
                        <span>
                          {state.myResult?.correct ? (
                            <CheckCircle2 size={24} />
                          ) : (
                            <Headphones size={24} />
                          )}
                        </span>
                        <div>
                          <strong>
                            {state.myResult?.correct
                              ? 'You got it'
                              : state.myAnswer
                                ? 'A good guess. A different story.'
                                : 'This one slipped by.'}
                          </strong>
                          <small>
                            {state.myResult?.correct
                              ? 'Your instincts were right on the money.'
                              : `The lyrics were about ${state.correctName}.`}
                          </small>
                        </div>
                        <b>+{state.myResult?.points ?? 0}</b>
                      </div>
                      <Votes votes={state.votes} />
                      <div className="player-score-title">
                        <span className="eyebrow">THE ROOM SO FAR</span>
                        <Trophy size={17} />
                      </div>
                      <Standings standings={state.standings} playerId={identity.id} />
                      <p className="next-song-note">The host will take it from here.</p>
                    </>
                  )}
                </>
              )}
            </main>
          )}
        </>
      )}
      <footer className="player-footer">
        <span>OFF THE RECORD</span>
        <span>Trust the lyrics. Not the names.</span>
      </footer>
    </div>
  );
}
