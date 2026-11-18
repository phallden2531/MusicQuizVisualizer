import { useState } from 'react';
import { ArrowUpRight, ChevronRight, Headphones, ListMusic, Plus, Save, Users } from 'lucide-react';
import type { GameView, Song } from '../../shared/types';
import { Saved } from '../components';
import { Lineup } from './Lineup';
import { SongEditor } from './SongEditor';
import { songReady, type QuizEditor } from './useQuizEditor';

export function Studio({
  editor,
  game,
  busy,
  onCreateRoom,
}: {
  editor: QuizEditor;
  game: GameView | null;
  busy: boolean;
  onCreateRoom: () => void;
}) {
  const { quiz, dirty, saving, uploading, edit } = editor;
  const [section, setSection] = useState<'songs' | 'roster'>('songs');
  const [selected, setSelected] = useState(0);
  const song = quiz.songs[selected];
  const readyCount = quiz.songs.filter(songReady).length;
  const allReady = quiz.songs.length > 0 && readyCount === quiz.songs.length;
  const answersUnique =
    new Set(quiz.songs.map((s) => s.correctColleagueId)).size === quiz.songs.length;
  const canCreate =
    !dirty &&
    allReady &&
    answersUnique &&
    quiz.colleagues.length >= 2 &&
    (!game || game.phase === 'lobby' || game.phase === 'finished');
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
  function moveSong(direction: number) {
    const index = selected + direction;
    if (index < 0 || index >= quiz.songs.length) return;
    const songs = [...quiz.songs];
    [songs[selected], songs[index]] = [songs[index], songs[selected]];
    edit({ ...quiz, songs });
    setSelected(index);
  }
  function deleteSong(target: Song) {
    if (!confirm(`Delete “${target.title.trim() || 'Untitled track'}” and its uploads?`)) return;
    edit({ ...quiz, songs: quiz.songs.filter((s) => s.id !== target.id) });
    setSelected(Math.max(0, selected - 1));
  }
  const setupTip = dirty
    ? 'Save your changes before creating a live room.'
    : quiz.colleagues.length < 2
      ? 'Add at least two colleagues to the lineup before creating a live room.'
      : quiz.songs.length > 0 && !allReady
        ? 'Every song needs a title, audio, a picture, lyrics and the correct colleague.'
        : !answersUnique
          ? 'Each colleague can be the answer to only one song, since revealed colleagues leave the roster.'
          : '';
  return (
    <main className="studio">
      <div className="studio-heading">
        <div>
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
            disabled={saving || Boolean(uploading) || !dirty}
            onClick={editor.save}
          >
            <Save size={16} />
            Save quiz
          </button>
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
          onClick={onCreateRoom}
        >
          Create live room <ArrowUpRight size={17} />
        </button>
      </div>
      {setupTip && <p className="setup-tip">{setupTip}</p>}
      {section === 'songs' ? (
        <div className="setlist-layout">
          <aside className="setlist-sidebar">
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
                  editor.setNotice('');
                }}
              >
                <span className="track-index">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{s.title.trim() || 'Untitled track'}</strong>
                  <small>{songReady(s) ? 'Ready for the spotlight' : 'A few details to add'}</small>
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
            <SongEditor
              key={song.id}
              editor={editor}
              song={song}
              index={selected}
              onMove={moveSong}
              onDelete={() => deleteSong(song)}
            />
          ) : (
            <section className="empty-setlist sheet">
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
        <Lineup editor={editor} />
      )}
    </main>
  );
}
