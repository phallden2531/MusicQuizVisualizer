import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronRight,
  Disc3,
  Headphones,
  ImagePlus,
  ListMusic,
  LoaderCircle,
  LogOut,
  Monitor,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Volume2,
} from 'lucide-react';
import type { AssetInfo, GameView, Quiz, Song } from '../shared/types';
import { api, json } from './api';
import {
  Badge,
  Brand,
  Countdown,
  ErrorNotice,
  Footer,
  QR,
  RecordArt,
  Saved,
  Standings,
} from './components';
import { useGame, useNow } from './useGame';

export function Host() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [quiz, setQuiz] = useState<Quiz>({ title: '', colleagues: [], songs: [] });
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<'studio' | 'live'>('studio');
  const [section, setSection] = useState<'songs' | 'roster'>('songs');
  const [selected, setSelected] = useState(0);
  const [initialGame, setInitialGame] = useState<GameView | null>(null);
  const [uploading, setUploading] = useState('');
  const [uploaded, setUploaded] = useState('');
  const [names, setNames] = useState('');
  const editVersion = useRef(0);
  const live = useGame('host', undefined, undefined, authenticated);
  const game = live.state ?? initialGame;
  const now = useNow(live.offset);
  const song = quiz.songs[selected];
  useEffect(() => {
    api<{ quiz: Quiz; game: GameView | null }>('/api/host')
      .then((data) => {
        setQuiz(data.quiz);
        setInitialGame(data.game);
        setAuthenticated(true);
        if (data.game && data.game.phase !== 'finished') setTab('live');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (live.closed) {
      setAuthenticated(false);
      setError(live.error);
    }
  }, [live.closed, live.error]);
  function edit(next: Quiz) {
    editVersion.current++;
    setQuiz(next);
    setDirty(true);
    setUploaded('');
  }
  function updateSong(patch: Partial<Song>) {
    edit({ ...quiz, songs: quiz.songs.map((s, i) => (i === selected ? { ...s, ...patch } : s)) });
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/host/login', { method: 'POST', body: json({ password }) });
      const data = await api<{ quiz: Quiz; game: GameView | null }>('/api/host');
      setQuiz(data.quiz);
      setInitialGame(data.game);
      setAuthenticated(true);
      setPassword('');
      if (data.game && data.game.phase !== 'finished') setTab('live');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setError('');
    setBusy(true);
    const submittedVersion = editVersion.current;
    try {
      const saved = await api<Quiz>('/api/quiz', { method: 'PUT', body: json(quiz) });
      if (editVersion.current === submittedVersion) {
        setQuiz(saved);
        setDirty(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(kind: 'audio' | 'image', file?: File) {
    if (!file || !song) return;
    setError('');
    setUploading(kind);
    const songId = song.id;
    try {
      const form = new FormData();
      form.set('kind', kind);
      form.set('file', file);
      const info = await api<AssetInfo>('/api/assets', { method: 'POST', body: form });
      editVersion.current++;
      setQuiz((current) => ({
        ...current,
        songs: current.songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                ...(kind === 'audio'
                  ? { audioId: info.id, durationMs: info.durationMs! }
                  : { imageId: info.id }),
              }
            : s,
        ),
      }));
      setDirty(true);
      setUploaded(kind === 'audio' ? 'Audio uploaded' : 'Picture uploaded');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading('');
    }
  }
  function addSong() {
    const next: Song = {
      id: crypto.randomUUID(),
      title: '',
      lyrics: '',
      audioId: '',
      imageId: '',
      durationMs: 0,
      correctColleagueId: '',
    };
    edit({ ...quiz, songs: [...quiz.songs, next] });
    setSelected(quiz.songs.length);
  }
  function addNames(e: FormEvent) {
    e.preventDefault();
    const existing = new Set(quiz.colleagues.map((c) => c.name.toLowerCase()));
    const additions = names
      .split('\n')
      .map((s) => s.trim())
      .filter((name) => {
        if (!name || existing.has(name.toLowerCase())) return false;
        existing.add(name.toLowerCase());
        return true;
      })
      .map((name) => ({ id: crypto.randomUUID(), name }));
    edit({ ...quiz, colleagues: [...quiz.colleagues, ...additions] });
    setNames('');
  }
  function moveSong(direction: number) {
    const index = selected + direction;
    if (index < 0 || index >= quiz.songs.length) return;
    const songs = [...quiz.songs];
    [songs[selected], songs[index]] = [songs[index], songs[selected]];
    edit({ ...quiz, songs });
    setSelected(index);
  }
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
  async function command(command: string) {
    if (!game) return;
    setError('');
    setBusy(true);
    try {
      await api('/api/game/command', {
        method: 'POST',
        body: json({ command, requestId: crypto.randomUUID(), runId: game.runId }),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const readyCount = quiz.songs.filter(
    (s) => s.title && s.lyrics.trim() && s.audioId && s.imageId && s.correctColleagueId,
  ).length;
  const canCreate =
    !dirty &&
    quiz.songs.length > 0 &&
    readyCount === quiz.songs.length &&
    quiz.colleagues.length >= 2 &&
    (!game || game.phase === 'lobby' || game.phase === 'finished');
  if (loading)
    return (
      <div className="loading-page">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Opening the studio…</p>
      </div>
    );
  if (!authenticated)
    return (
      <div className="page-shell login-page">
        <header className="topbar">
          <Brand />
          <span className="header-note">THE HOST HAS THE BEST SEAT.</span>
        </header>
        <main className="login-layout">
          <div className="login-copy">
            <span className="eyebrow">
              <Headphones size={15} /> BACKSTAGE ACCESS
            </span>
            <h1>
              Set the mood.
              <br />
              <em>
                Keep them
                <br />
                guessing.
              </em>
            </h1>
            <p className="intro">Your songs. Your colleagues. Their moment of truth.</p>
            <RecordArt compact />
          </div>
          <form className="login-card panel" onSubmit={login}>
            <span className="mini-icon">
              <Settings2 size={22} />
            </span>
            <h2>Welcome to the studio.</h2>
            <p className="muted">Sign in to build your setlist and run the show.</p>
            <label htmlFor="host-password">Host password</label>
            <input
              id="host-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your backstage pass"
              required
              minLength={1}
            />
            <ErrorNotice message={error} />
            <button className="button button-primary button-full" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <>
                  Enter the studio <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className="form-note">
              Here to play?{' '}
              <a href="/">
                Join with a room code <ArrowUpRight size={13} />
              </a>
            </p>
          </form>
        </main>
        <Footer />
      </div>
    );
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
            await api('/api/host/logout', { method: 'POST' });
            setAuthenticated(false);
          }}
        >
          <LogOut size={17} />
        </button>
      </header>
      <ErrorNotice message={error || live.error} />
      {tab === 'studio' ? (
        <main className="studio">
          <div className="studio-heading">
            <div>
              <span className="eyebrow">A LITTLE PREPARATION. A LOT OF SPECULATION.</span>
              <h1>
                Your quiz studio<span className="accent">.</span>
              </h1>
              <p className="muted">
                Build a setlist. Gather your suspects. Let the music do the talking.
              </p>
            </div>
            <div className="heading-actions">
              <Saved dirty={dirty} />
              <button
                className="button button-secondary"
                disabled={busy || Boolean(uploading) || !dirty}
                onClick={save}
              >
                <Save size={16} />
                Save quiz
              </button>
            </div>
          </div>
          <div className="studio-hero">
            <div className="hero-copy">
              <Badge>YOUR PRIVATE LISTENING PARTY</Badge>
              <h2>
                Familiar faces.
                <br />
                <span>Unexpected lyrics.</span>
              </h2>
              <p>
                Every track tells a story.
                <br />
                Only one colleague fits the bill.
              </p>
              <div className="hero-bottom">
                <span>
                  <Disc3 size={15} /> ORIGINAL SONGS. ORIGINAL SUSPECTS.
                </span>
                <span>VOL. 01</span>
              </div>
            </div>
            <RecordArt />
          </div>
          <div className="studio-stats">
            <div>
              <span className="stat-icon">
                <Music2 size={19} />
              </span>
              <strong>{String(quiz.songs.length).padStart(2, '0')}</strong>
              <span>tracks on the setlist</span>
            </div>
            <div>
              <span className="stat-icon">
                <Users size={19} />
              </span>
              <strong>{String(quiz.colleagues.length).padStart(2, '0')}</strong>
              <span>possible suspects</span>
            </div>
            <div>
              <span className="stat-icon">
                <Check size={19} />
              </span>
              <strong>{String(readyCount).padStart(2, '0')}</strong>
              <span>tracks ready to play</span>
            </div>
            <div className="stats-note">
              <Sparkles size={16} />
              <span>
                A familiar name in the song
                <br />
                doesn’t mean it’s about them.
              </span>
            </div>
          </div>
          <div className="studio-toolbar">
            <div className="section-tabs">
              <button
                className={section === 'songs' ? 'active' : ''}
                onClick={() => setSection('songs')}
              >
                <ListMusic size={17} />
                The setlist<span>{quiz.songs.length}</span>
              </button>
              <button
                className={section === 'roster' ? 'active' : ''}
                onClick={() => setSection('roster')}
              >
                <Users size={17} />
                The lineup<span>{quiz.colleagues.length}</span>
              </button>
            </div>
            <button
              className="button button-primary"
              disabled={busy || !canCreate || Boolean(uploading)}
              onClick={createRoom}
            >
              Create live room <ArrowUpRight size={17} />
            </button>
          </div>
          {dirty && <p className="setup-tip">Save your changes before creating a live room.</p>}
          {section === 'songs' ? (
            <div className="setlist-layout">
              <aside className="setlist-sidebar panel">
                <div className="sidebar-heading">
                  <span>RUNNING ORDER</span>
                  <span>{quiz.songs.length} TRACKS</span>
                </div>
                {quiz.songs.length === 0 && (
                  <p className="sidebar-empty">
                    Your next great team night starts with the first track.
                  </p>
                )}
                {quiz.songs.map((s, i) => (
                  <button
                    className={`song-row ${selected === i ? 'selected' : ''}`}
                    key={s.id}
                    onClick={() => {
                      setSelected(i);
                      setUploaded('');
                    }}
                  >
                    <span className="track-index">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <strong>{s.title || 'Untitled track'}</strong>
                      <small>
                        {s.audioId && s.imageId && s.lyrics && s.correctColleagueId
                          ? 'Ready for the spotlight'
                          : 'A few details to add'}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                <button
                  className="add-song-button"
                  onClick={addSong}
                  disabled={quiz.songs.length >= 50}
                >
                  <Plus size={17} />
                  Add a song
                </button>
                <div className="sidebar-footnote">
                  <Headphones size={17} />
                  <span>
                    Put your strongest mystery first.
                    <br />
                    You can reorder tracks anytime.
                  </span>
                </div>
              </aside>
              {song ? (
                <section className="song-editor panel" key={song.id}>
                  <div className="editor-heading">
                    <div>
                      <span className="eyebrow">TRACK {String(selected + 1).padStart(2, '0')}</span>
                      <h2>The details make the mystery.</h2>
                    </div>
                    <div className="editor-tools">
                      <button
                        className="icon-button"
                        aria-label="Move song up"
                        disabled={selected === 0}
                        onClick={() => moveSong(-1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Move song down"
                        disabled={selected === quiz.songs.length - 1}
                        onClick={() => moveSong(1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label="Delete song"
                        onClick={() => {
                          edit({ ...quiz, songs: quiz.songs.filter((s) => s.id !== song.id) });
                          setSelected(Math.max(0, selected - 1));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="song-title">
                        Song title <span>HOST ONLY</span>
                      </label>
                      <input
                        id="song-title"
                        value={song.title}
                        onChange={(e) => updateSong({ title: e.target.value })}
                        placeholder="Give this mystery a title"
                        maxLength={120}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="correct-colleague">
                        Correct colleague <span>THE REAL SUBJECT</span>
                      </label>
                      <select
                        id="correct-colleague"
                        value={song.correctColleagueId}
                        onChange={(e) => updateSong({ correctColleagueId: e.target.value })}
                      >
                        <option value="">Who’s it really about?</option>
                        {quiz.colleagues.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="upload-grid">
                    <label className={`upload-zone ${song.audioId ? 'has-upload' : ''}`}>
                      <input
                        aria-label="Upload audio"
                        type="file"
                        accept="audio/mpeg,audio/mp4,.mp3,.m4a"
                        disabled={Boolean(uploading)}
                        onChange={(e) => upload('audio', e.target.files?.[0])}
                      />
                      <span className="upload-icon">
                        {uploading === 'audio' ? (
                          <LoaderCircle className="spin" />
                        ) : song.audioId ? (
                          <Check />
                        ) : (
                          <Upload />
                        )}
                      </span>
                      <strong>
                        {song.audioId ? 'Audio is on the record' : 'Drop in the music'}
                      </strong>
                      <small>
                        {song.audioId
                          ? `${Math.floor(song.durationMs / 60000)}:${String(Math.round(song.durationMs / 1000) % 60).padStart(2, '0')} · Click to replace`
                          : 'Choose an MP3 or M4A · Up to 30 MB'}
                      </small>
                    </label>
                    <label
                      className={`upload-zone image-upload ${song.imageId ? 'has-upload' : ''}`}
                    >
                      <input
                        aria-label="Upload picture"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={Boolean(uploading)}
                        onChange={(e) => upload('image', e.target.files?.[0])}
                      />
                      {song.imageId ? (
                        <img src={`/api/assets/${song.imageId}`} alt="Colleague picture preview" />
                      ) : (
                        <span className="upload-icon">
                          {uploading === 'image' ? (
                            <LoaderCircle className="spin" />
                          ) : (
                            <ImagePlus />
                          )}
                        </span>
                      )}
                      <strong>
                        {song.imageId ? 'The face behind the lyrics' : 'Add the reveal picture'}
                      </strong>
                      <small>
                        {song.imageId
                          ? 'Click to replace · Hidden until the reveal'
                          : 'JPEG, PNG or WebP · Up to 10 MB'}
                      </small>
                    </label>
                  </div>
                  {uploaded && (
                    <p className="upload-success" role="status">
                      <Check size={14} />
                      {uploaded}
                    </p>
                  )}
                  {song.audioId && (
                    <audio
                      className="audio-preview"
                      controls
                      preload="metadata"
                      src={`/api/assets/${song.audioId}`}
                      aria-label="Preview uploaded audio"
                    />
                  )}
                  <label htmlFor="song-lyrics">
                    Lyrics <span>SHOWN WHILE THE SONG PLAYS</span>
                  </label>
                  <textarea
                    id="song-lyrics"
                    className="lyrics-input"
                    value={song.lyrics}
                    onChange={(e) => updateSong({ lyrics: e.target.value })}
                    placeholder={
                      'Paste the lyrics here…\n\nKeep the misleading names. That’s part of the fun.'
                    }
                    maxLength={30000}
                    rows={8}
                  />
                  <div className="editor-footnote">
                    <span>
                      <Volume2 size={14} />
                      Audio plays on the room screen only.
                    </span>
                    <span>Answers close 15 seconds after the song.</span>
                  </div>
                </section>
              ) : (
                <section className="empty-setlist panel">
                  <span className="empty-disc">
                    <Disc3 size={52} strokeWidth={1} />
                  </span>
                  <span className="eyebrow">THE FIRST TRACK IS ALWAYS SPECIAL</span>
                  <h2>
                    No tracks on the record.
                    <br />
                    <span>Yet.</span>
                  </h2>
                  <p className="muted">
                    Add a song, its lyrics, and a familiar face.
                    <br />
                    We’ll take care of the suspense.
                  </p>
                  <button className="button button-secondary" onClick={addSong}>
                    <Plus size={16} />
                    Add your first track
                  </button>
                </section>
              )}
            </div>
          ) : (
            <section className="roster-layout">
              <form className="panel roster-add" onSubmit={addNames}>
                <span className="eyebrow">EVERYONE’S A SUSPECT</span>
                <h2>Meet the lineup.</h2>
                <p className="muted">
                  Add everyone players can guess. Include the names mentioned in the lyrics to keep
                  things interesting.
                </p>
                <label htmlFor="colleague-names">Colleague names</label>
                <textarea
                  id="colleague-names"
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder={'One name per line\nAlex\nSam\nJordan'}
                  rows={6}
                />
                <button className="button button-primary" disabled={!names.trim()}>
                  <Plus size={16} />
                  Add colleagues
                </button>
              </form>
              <div className="panel roster-list">
                <div className="sidebar-heading">
                  <span>THE USUAL SUSPECTS</span>
                  <span>{quiz.colleagues.length} PEOPLE</span>
                </div>
                {quiz.colleagues.length === 0 ? (
                  <p className="muted">A good mystery needs a few familiar faces.</p>
                ) : (
                  quiz.colleagues.map((c, i) => (
                    <div className="colleague-row" key={c.id}>
                      <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
                      <input
                        aria-label={`Colleague ${i + 1} name`}
                        value={c.name}
                        maxLength={80}
                        onChange={(e) =>
                          edit({
                            ...quiz,
                            colleagues: quiz.colleagues.map((item) =>
                              item.id === c.id ? { ...item, name: e.target.value } : item,
                            ),
                          })
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label={`Remove ${c.name}`}
                        onClick={() =>
                          edit({
                            ...quiz,
                            colleagues: quiz.colleagues.filter((item) => item.id !== c.id),
                            songs: quiz.songs.map((s) =>
                              s.correctColleagueId === c.id ? { ...s, correctColleagueId: '' } : s,
                            ),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </main>
      ) : game ? (
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
            <Badge live={live.connected}>
              {live.connected ? 'LIVE CONNECTION' : 'RECONNECTING'}
            </Badge>
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
                  <p className="muted">
                    Build the suspense. Reveal the colleague when you’re ready.
                  </p>
                ) : game.phase === 'results' ? (
                  <p className="muted">
                    {game.nextSongTitle
                      ? `Next up: ${game.nextSongTitle}`
                      : 'That was the final song. Time for the podium.'}
                  </p>
                ) : null}
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
              <div className="control-buttons">
                {game.paused ? (
                  <button
                    className="button button-primary button-full"
                    disabled={busy || !game.screenReady || !live.connected}
                    onClick={() => command('resume')}
                  >
                    <Play size={17} />
                    Resume round
                  </button>
                ) : game.phase === 'lobby' ? (
                  <button
                    className="button button-primary button-full"
                    disabled={busy || !game.screenReady || !game.players.length || !live.connected}
                    onClick={() => command('start')}
                  >
                    <Play size={17} />
                    Start first song
                  </button>
                ) : game.phase === 'locked' ? (
                  <button
                    className="button button-primary button-full"
                    disabled={busy || !live.connected}
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
                      !live.connected ||
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
                    disabled={busy || !live.connected}
                    onClick={() => command('pause')}
                  >
                    <Pause size={17} />
                    Pause round
                  </button>
                ) : game.phase === 'finished' ? (
                  <button
                    className="button button-secondary button-full"
                    onClick={() => setTab('studio')}
                  >
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
              {!['lobby', 'finished'].includes(game.phase) && (
                <button
                  className="text-button end-game"
                  onClick={() => {
                    if (confirm('End this game now? This closes the current round for everyone.'))
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
                    <QR value={`${location.origin}/join/${game.roomCode}`} />
                    <div>
                      <span className="eyebrow">SCAN. JOIN. START SPECULATING.</span>
                      <strong className="room-code">{game.roomCode}</strong>
                      <button
                        className="text-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${location.origin}/join/${game.roomCode}`,
                            );
                            setUploaded('Invite link copied');
                          } catch {
                            setError('Copy the join link from the presentation screen.');
                          }
                        }}
                      >
                        Copy invite link <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                  {uploaded === 'Invite link copied' && (
                    <p className="upload-success">{uploaded}</p>
                  )}
                  <div className="player-chips">
                    {game.players.map((p) => (
                      <span key={p.id} className={p.connected ? 'connected' : ''}>
                        <span className="status-dot" />
                        {p.name}
                      </span>
                    ))}
                  </div>
                  {!game.players.length && (
                    <div className="waiting-guests">
                      <Users size={25} />
                      <p>
                        Your people will appear here.
                        <br />
                        <span className="muted">
                          Share the code or let them scan the big screen.
                        </span>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Standings standings={game.standings} />
              )}
            </section>
          </div>
        </main>
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
