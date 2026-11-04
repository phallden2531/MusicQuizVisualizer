import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Colleague } from '../../shared/types';
import type { QuizEditor } from './useQuizEditor';

export function Lineup({ editor }: { editor: QuizEditor }) {
  const { quiz, edit } = editor;
  const [names, setNames] = useState('');
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
  function remove(colleague: Colleague) {
    const answers = quiz.songs.filter((s) => s.correctColleagueId === colleague.id);
    const warning = answers.length
      ? `${colleague.name} is the answer to ${answers.length === 1 ? 'a song' : `${answers.length} songs`}. Remove them anyway?`
      : `Remove ${colleague.name} from the lineup?`;
    if (!confirm(warning)) return;
    edit({
      ...quiz,
      colleagues: quiz.colleagues.filter((item) => item.id !== colleague.id),
      songs: quiz.songs.map((s) =>
        s.correctColleagueId === colleague.id ? { ...s, correctColleagueId: '' } : s,
      ),
    });
  }
  return (
    <section className="roster-layout">
      <form className="panel roster-add" onSubmit={addNames}>
        <span className="eyebrow">EVERYONE’S A SUSPECT</span>
        <h2>Meet the lineup.</h2>
        <p className="muted">
          Add everyone players can guess. Include the names mentioned in the lyrics to keep things
          interesting.
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
                onClick={() => remove(c)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
