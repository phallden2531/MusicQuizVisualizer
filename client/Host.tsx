import { useEffect, useState } from 'react';
import { ArrowRight, ListMusic, LoaderCircle, LogOut, Radio } from 'lucide-react';
import type { GameView, Quiz } from '../shared/types';
import { api, json } from './api';
import { Brand, ErrorNotice, Footer } from './components';
import { LiveRoom } from './host/LiveRoom';
import { Login } from './host/Login';
import { Studio } from './host/Studio';
import { useQuizEditor } from './host/useQuizEditor';
import { useGame, useNow } from './useGame';

export function Host() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'studio' | 'live'>('studio');
  const [initialGame, setInitialGame] = useState<GameView | null>(null);
  const editor = useQuizEditor(setError);
  const live = useGame('host', undefined, undefined, authenticated);
  const game = live.state ?? initialGame;
  const now = useNow(
    live.offset,
    tab === 'live' && ['playing', 'grace', 'revealing'].includes(game?.phase ?? ''),
  );
  async function loadHost() {
    const data = await api<{ quiz: Quiz; game: GameView | null }>('/api/host');
    editor.load(data.quiz);
    setInitialGame(data.game);
    setAuthenticated(true);
    if (data.game && data.game.phase !== 'finished') setTab('live');
  }
  useEffect(() => {
    loadHost()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (live.closed) {
      setAuthenticated(false);
      setError(live.error);
    }
  }, [live.closed, live.error]);
  async function createRoom() {
    setError('');
    setBusy(true);
    try {
      await api('/api/games', { method: 'POST', body: '{}' });
      const data = await api<{ game: GameView }>('/api/host');
      setInitialGame(data.game);
      setTab('live');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function command(name: string) {
    if (!game) return;
    setError('');
    setBusy(true);
    try {
      await api('/api/game/command', {
        method: 'POST',
        body: json({ command: name, requestId: crypto.randomUUID(), runId: game.runId }),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="loading-page">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Opening the studio…</p>
      </div>
    );
  if (!authenticated) return <Login initialError={error} onLogin={loadHost} />;
  return (
    <div className="page-shell host-shell">
      <header className="topbar">
        <Brand />
        <nav className="main-nav" aria-label="Host navigation">
          <button className={tab === 'studio' ? 'nav-active' : ''} onClick={() => setTab('studio')}>
            <ListMusic size={16} />
            Quiz studio
          </button>
          <button className={tab === 'live' ? 'nav-active' : ''} onClick={() => setTab('live')}>
            <Radio size={16} />
            Live room{game && game.phase !== 'finished' && <span className="nav-dot" />}
          </button>
        </nav>
        <button
          className="icon-button logout-button"
          aria-label="Sign out"
          onClick={async () => {
            if (editor.dirty && !confirm('Sign out and lose your unsaved changes?')) return;
            await api('/api/host/logout', { method: 'POST' });
            setError('');
            setAuthenticated(false);
          }}
        >
          <LogOut size={17} />
        </button>
      </header>
      <ErrorNotice message={error || live.error} />
      {tab === 'studio' ? (
        <Studio editor={editor} game={game} busy={busy} onCreateRoom={createRoom} />
      ) : game ? (
        <LiveRoom
          game={game}
          connected={live.connected}
          now={now}
          busy={busy}
          command={command}
          onError={setError}
          onBackToStudio={() => setTab('studio')}
        />
      ) : (
        <main className="empty-live panel">
          <Radio size={40} />
          <h1>The stage is waiting.</h1>
          <p className="muted">
            Prepare your songs and colleagues in the studio, then create a live room.
          </p>
          <button className="button button-primary" onClick={() => setTab('studio')}>
            Go to the studio <ArrowRight size={16} />
          </button>
        </main>
      )}
      <Footer />
    </div>
  );
}
