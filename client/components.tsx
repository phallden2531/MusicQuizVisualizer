import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, AudioLines, Check, Disc3, Pause, Trophy, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import type { GameView, Standing, Vote } from '../shared/types';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a className={`brand ${small ? 'brand-small' : ''}`} href="/">
      <span className="brand-symbol">
        <AudioLines size={23} strokeWidth={2.3} />
      </span>
      <span>
        OFF THE
        <br />
        <strong>RECORD</strong>
        <i>THE COLLEAGUE MUSIC QUIZ</i>
      </span>
    </a>
  );
}
export function Badge({ children, live = false }: { children: ReactNode; live?: boolean }) {
  return (
    <span className={`badge ${live ? 'badge-live' : ''}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <div className="notice notice-error" role="alert">
      {message}
    </div>
  ) : null;
}
export function ConnectionNotice({ connected, error }: { connected: boolean; error?: string }) {
  return !connected ? (
    <div className="notice connection-notice" role="status">
      <WifiOff size={16} />
      {error || 'Reconnecting to the room…'}
    </div>
  ) : null;
}
export function Equalizer({ large = false }: { large?: boolean }) {
  return (
    <span className={`equalizer ${large ? 'equalizer-large' : ''}`} aria-hidden="true">
      {Array.from({ length: 15 }, (_, i) => (
        <i
          key={i}
          style={{ animationDelay: `${i * -0.13}s`, height: `${20 + ((i * 31) % 65)}%` }}
        />
      ))}
    </span>
  );
}
export function RecordArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`record-art ${compact ? 'record-compact' : ''}`} aria-hidden="true">
      <div className="record-sleeve">
        <span>VOL. 01</span>
        <AudioLines size={50} />
        <small>
          FAMILIAR FACES.
          <br />
          UNEXPECTED LYRICS.
        </small>
      </div>
      <div className="vinyl">
        <div className="vinyl-label">
          <AudioLines size={22} />
          <span>OFF THE RECORD</span>
          <i />
        </div>
      </div>
      <span className="record-spark">✳</span>
    </div>
  );
}
export function QR({ value }: { value: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: 360,
      margin: 2,
      color: { dark: '#151813', light: '#ffffff' },
    }).then((data) => {
      if (active) setUrl(data);
    });
    return () => {
      active = false;
    };
  }, [value]);
  return (
    <div className="qr-code">
      {url ? (
        <img src={url} alt="Scan this QR code to join the quiz" />
      ) : (
        <span>Creating QR code…</span>
      )}
    </div>
  );
}
export function Standings({
  standings,
  playerId,
  columns = false,
}: {
  standings: Standing[];
  playerId?: string;
  /** Two columns, for a full room on the projector. */
  columns?: boolean;
}) {
  return (
    <div className={`standings ${columns ? 'standings-columns' : ''}`}>
      <div className="standings-label">
        <span>PLAYER</span>
        <span>POINTS</span>
      </div>
      {standings.length === 0 && <p className="muted">The guest list is still open.</p>}
      {standings.map((p) => (
        <div className={`standing ${p.id === playerId ? 'standing-me' : ''}`} key={p.id}>
          <span className={`rank ${leads(p) ? 'rank-1' : ''}`}>
            {leads(p) ? <Trophy size={17} /> : String(p.rank).padStart(2, '0')}
          </span>
          <span className="standing-name">
            {p.name}
            {p.id === playerId && <small>YOU</small>}
          </span>
          {p.roundPoints > 0 && <span className="points-added">+{p.roundPoints}</span>}
          <strong>{p.score.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}
/** A trophy means something only once somebody has actually scored. */
export const leads = (p: Standing) => p.rank === 1 && p.score > 0;
export function RoundTag({ state }: { state: GameView }) {
  return (
    <span className="round-tag">
      <Disc3 size={15} />
      TRACK {String(state.roundIndex + 1).padStart(2, '0')}{' '}
      <span>/ {String(state.totalRounds).padStart(2, '0')}</span>
    </span>
  );
}
export function Countdown({ state, now }: { state: GameView; now: number }) {
  if (state.phase !== 'grace') return null;
  const seconds = state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;
  return (
    <div className="last-call">
      <div>
        <span className="eyebrow">THE MUSIC HAS STOPPED</span>
        <strong>Last call for guesses</strong>
      </div>
      {seconds === null ? (
        <span className="countdown-number is-paused">
          <Pause size={24} />
          <small>PAUSED</small>
        </span>
      ) : (
        <span className="countdown-number">
          {seconds}
          <small>SEC</small>
        </span>
      )}
    </div>
  );
}
export function Reveal({ state, now }: { state: GameView; now: number }) {
  const revealing = state.phase === 'revealing';
  const remaining = Math.max(0, (state.revealEndsAt ?? now) - now);
  return (
    <div className={`reveal ${revealing ? 'is-revealing' : ''}`}>
      <div className="reveal-photo">
        {state.imageUrl && (
          <img
            src={`${state.imageUrl}?round=${state.roundIndex}`}
            alt={revealing ? 'The mystery colleague coming into focus' : state.correctName}
            style={{
              filter: revealing ? `blur(${(24 * remaining) / 5000}px)` : 'none',
              transform: revealing ? 'scale(1.08)' : undefined,
            }}
          />
        )}
        <div className="photo-corner photo-corner-tl" />
        <div className="photo-corner photo-corner-br" />
        <span className="photo-label">{revealing ? 'IDENTITY UNKNOWN' : 'MYSTERY SOLVED'}</span>
      </div>
      <div className="reveal-caption">
        <span className="eyebrow">{revealing ? 'WAIT FOR IT…' : 'THE SONG WAS REALLY ABOUT'}</span>
        {revealing ? (
          <h2>
            Coming into focus<span className="blink">.</span>
          </h2>
        ) : (
          <h2>{state.correctName}</h2>
        )}
      </div>
    </div>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span>A familiar name. A different story.</span>
      <span>
        Made for your kind of people <ArrowUpRight size={13} />
      </span>
    </footer>
  );
}
export function Saved({ dirty }: { dirty: boolean }) {
  return (
    <span className={`saved-indicator ${dirty ? 'is-dirty' : ''}`}>
      {dirty ? <span className="status-dot" /> : <Check size={14} />}
      {dirty ? 'Unsaved changes' : 'All changes saved'}
    </span>
  );
}
export function Votes({ votes }: { votes?: Vote[] }) {
  if (!votes?.length) return null;
  const total = votes.reduce((sum, v) => sum + v.count, 0);
  return (
    <section className="votes" aria-label="How the room voted">
      <span className="eyebrow">HOW THE ROOM VOTED</span>
      {votes.map((v) => (
        <div className={`vote ${v.correct ? 'is-correct' : ''}`} key={v.colleagueId}>
          <span className="vote-name">
            {v.correct && <Check size={13} />}
            {v.name}
          </span>
          <span className="vote-bar" aria-hidden="true">
            <i style={{ width: `${(100 * v.count) / total}%` }} />
          </span>
          <strong>{v.count}</strong>
        </div>
      ))}
    </section>
  );
}
/**
 * Lyrics for the room screen. Nobody can scroll a projector, so the text is
 * laid out in up to three columns at the largest size that fits the panel.
 */
export function FittedLyrics({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    function fit() {
      const el = box.current!;
      const fits = () =>
        el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
      for (let size = 34; size >= 15; size--) {
        for (let columns = 1; columns <= 3; columns++) {
          el.style.fontSize = `${size}px`;
          el.style.columnCount = String(columns);
          if (fits()) {
            setOverflowing(false);
            return;
          }
        }
      }
      setOverflowing(true);
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [text]);
  return (
    <div ref={box} className={`screen-lyrics ${overflowing ? 'is-overflowing' : ''}`}>
      {text
        .split(/\n\s*\n/)
        .filter((stanza) => stanza.trim())
        .map((stanza, i) => (
          <p key={i}>{stanza.trim()}</p>
        ))}
    </div>
  );
}
