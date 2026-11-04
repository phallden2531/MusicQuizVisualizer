import { useEffect, useRef, useState } from 'react';
import type { AssetInfo, Quiz, Song } from '../../shared/types';
import { api, json } from '../api';

export const songReady = (s: Song) =>
  Boolean(s.title.trim() && s.lyrics.trim() && s.audioId && s.imageId && s.correctColleagueId);

/**
 * The host's working copy of the quiz: edits, uploads and saves. A save response
 * only replaces the working copy when nothing was edited while it was in flight.
 */
export function useQuizEditor(onError: (message: string) => void) {
  const [quiz, setQuiz] = useState<Quiz>({ title: '', colleagues: [], songs: [] });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'' | 'audio' | 'image'>('');
  const [notice, setNotice] = useState('');
  const editVersion = useRef(0);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);
  function load(saved: Quiz) {
    editVersion.current++;
    setQuiz(saved);
    setDirty(false);
  }
  function edit(next: Quiz) {
    editVersion.current++;
    setQuiz(next);
    setDirty(true);
    setNotice('');
  }
  function updateSong(id: string, patch: Partial<Song>) {
    edit({ ...quiz, songs: quiz.songs.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }
  async function save() {
    onError('');
    setSaving(true);
    const submittedVersion = editVersion.current;
    try {
      const saved = await api<Quiz>('/api/quiz', { method: 'PUT', body: json(quiz) });
      if (editVersion.current === submittedVersion) {
        setQuiz(saved);
        setDirty(false);
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function upload(songId: string, kind: 'audio' | 'image', file?: File) {
    if (!file) return;
    onError('');
    setUploading(kind);
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
      setNotice(kind === 'audio' ? 'Audio uploaded' : 'Picture uploaded');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading('');
    }
  }
  return {
    quiz,
    dirty,
    saving,
    uploading,
    notice,
    setNotice,
    load,
    edit,
    updateSong,
    save,
    upload,
  };
}
export type QuizEditor = ReturnType<typeof useQuizEditor>;
