import {
  ArrowDown,
  ArrowUp,
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import type { Song } from '../../shared/types';
import type { QuizEditor } from './useQuizEditor';

const formatDuration = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}`;

export function SongEditor({
  editor,
  song,
  index,
  onMove,
  onDelete,
}: {
  editor: QuizEditor;
  song: Song;
  index: number;
  onMove: (direction: number) => void;
  onDelete: () => void;
}) {
  const { quiz, uploading, notice } = editor;
  const update = (patch: Partial<Song>) => editor.updateSong(song.id, patch);
  return (
    <section className="song-editor panel" key={song.id}>
      <div className="editor-heading">
        <div>
          <span className="eyebrow">TRACK {String(index + 1).padStart(2, '0')}</span>
          <h2>The details make the mystery.</h2>
        </div>
        <div className="editor-tools">
          <button
            className="icon-button"
            aria-label="Move song up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Move song down"
            disabled={index === quiz.songs.length - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={16} />
          </button>
          <button className="icon-button danger" aria-label="Delete song" onClick={onDelete}>
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
            onChange={(e) => update({ title: e.target.value })}
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
            onChange={(e) => update({ correctColleagueId: e.target.value })}
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
            onChange={(e) => editor.upload(song.id, 'audio', e.target.files?.[0])}
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
          <strong>{song.audioId ? 'Audio is on the record' : 'Drop in the music'}</strong>
          <small>
            {song.audioId
              ? `${formatDuration(song.durationMs)} · Click to replace`
              : 'Choose an MP3 or M4A · Up to 30 MB'}
          </small>
        </label>
        <label className={`upload-zone image-upload ${song.imageId ? 'has-upload' : ''}`}>
          <input
            aria-label="Upload picture"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={Boolean(uploading)}
            onChange={(e) => editor.upload(song.id, 'image', e.target.files?.[0])}
          />
          {song.imageId ? (
            <img src={`/api/assets/${song.imageId}`} alt="Colleague picture preview" />
          ) : (
            <span className="upload-icon">
              {uploading === 'image' ? <LoaderCircle className="spin" /> : <ImagePlus />}
            </span>
          )}
          <strong>{song.imageId ? 'The face behind the lyrics' : 'Add the reveal picture'}</strong>
          <small>
            {song.imageId
              ? 'Click to replace · Hidden until the reveal'
              : 'JPEG, PNG or WebP · Up to 10 MB'}
          </small>
        </label>
      </div>
      {notice && notice !== 'Invite link copied' && (
        <p className="upload-success" role="status">
          <Check size={14} />
          {notice}
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
        onChange={(e) => update({ lyrics: e.target.value })}
        placeholder={'Paste the lyrics here…\n\nKeep the misleading names. That’s part of the fun.'}
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
  );
}
