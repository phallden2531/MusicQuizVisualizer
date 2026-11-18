import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Check, Trophy, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import type { GameView, Standing, Vote } from '../shared/types';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a className={`brand ${small ? 'brand-small' : ''}`} href="/" aria-label="Off the Record, home">
      <span className="brand-hello" aria-hidden="true">
        HELLO
      </span>
      <span className="brand-name" aria-hidden="true">
        Off the Record
      </span>
    </a>
  );
}
export type Tone = 'red' | 'yellow' | 'pink' | 'teal';
export const tones: Tone[] = ['red', 'teal', 'yellow', 'pink'];
/** The HELLO my-name-is sticker: the product's one recurring object. */
export function NameTag({
  children,
  tone = 'red',
  size = 'md',
  tilt = 0,
  className = '',
  slap = false,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tilt?: number;
  className?: string;
  /** Plays the slap-on settle when the tag first appears. */
  slap?: boolean;
}) {
  return (
    <div
      className={`name-tag tone-${tone} tag-${size} ${slap ? 'is-slapped' : ''} ${className}`}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
    >
      <span className="tag-hello" aria-hidden="true">
        HELLO
      </span>
      <span className="tag-intro" aria-hidden="true">
        my name is
      </span>
      <div className="tag-name">{children}</div>
    </div>
  );
}
/** A perforated raffle ticket. */
export function Ticket({
  children,
  tone = 'yellow',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <div className={`ticket tone-${tone} ${className}`}>{children}</div>;
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
/** The game in one picture: a tag that names one person and means another. */
export function DecoyArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`decoy-art ${compact ? 'decoy-compact' : ''}`} aria-hidden="true">
      <NameTag tone="teal" size="lg" tilt={-7} className="decoy-false">
        <span className="struck">Alex</span>
      </NameTag>
      <NameTag tone="red" size="lg" tilt={5} className="decoy-true">
        ?
      </NameTag>
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
      color: { dark: '#14161f', light: '#fbf8f2' },
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
/** The top three as name tags, winner in the middle (or on top on a phone). */
export function Podium({ standings, playerId }: { standings: Standing[]; playerId?: string }) {
  return (
    <div className="podium">
      {standings.slice(0, 3).map((p, i) => (
        <div className={`podium-place podium-${i}`} key={p.id}>
          <span className="podium-rank">
            {leads(p) ? <Trophy size={34} /> : String(p.rank).padStart(2, '0')}
          </span>
          <NameTag
            tone={(['red', 'teal', 'yellow'] as const)[i]}
            size={i === 0 ? 'lg' : 'md'}
            tilt={[-3, 4, -5][i]}
            slap
          >
            <h2>{p.name}</h2>
          </NameTag>
          <strong>
            {p.score.toLocaleString()}
            <small>
              {p.score === 1 ? 'POINT' : 'POINTS'}
              {p.id === playerId && ' · YOU'}
            </small>
          </strong>
        </div>
      ))}
    </div>
  );
}
/** Whole seconds left until a server timestamp, never negative. */
export const secondsUntil = (at: number, now: number) => Math.max(0, Math.ceil((at - now) / 1000));
/** A trophy means something only once somebody has actually scored. */
export const leads = (p: Standing) => p.rank === 1 && p.score > 0;
export function RoundTag({ state }: { state: GameView }) {
  return (
    <span className="round-tag">
      Song <strong>{String(state.roundIndex + 1).padStart(2, '0')}</strong>
      <span>of {String(state.totalRounds).padStart(2, '0')}</span>
    </span>
  );
}
export function Reveal({ state, now }: { state: GameView; now: number }) {
  const revealing = state.phase === 'revealing';
  const remaining = Math.max(0, (state.revealEndsAt ?? now) - now);
  return (
    <div className={`reveal ${revealing ? 'is-revealing' : 'is-revealed'}`}>
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
      </div>
      {revealing ? (
        <div className="reveal-caption">
          <h2>Coming into focus…</h2>
        </div>
      ) : (
        <NameTag tone="red" size="lg" tilt={-4} slap className="reveal-tag">
          <h2>{state.correctName}</h2>
        </NameTag>
      )}
    </div>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span>A familiar name. A different story.</span>
      <span>Made for your kind of people</span>
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
    <section className="votes" aria-labelledby="votes-heading">
      <h3 id="votes-heading">How the room voted</h3>
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
