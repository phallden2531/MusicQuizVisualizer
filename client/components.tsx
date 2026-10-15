import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, AudioLines, Check, Disc3, Trophy, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import type { GameView, Standing } from '../shared/types';

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
      {error || 'Connecting to the room… Your guess is safe.'}
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
  compact = false,
}: {
  standings: Standing[];
  playerId?: string;
  compact?: boolean;
}) {
  return (
    <div className={`standings ${compact ? 'standings-compact' : ''}`}>
      <div className="standings-label">
        <span>PLAYER</span>
        <span>POINTS</span>
      </div>
      {standings.length === 0 && <p className="muted">The guest list is still open.</p>}
      {standings.map((p) => (
        <div className={`standing ${p.id === playerId ? 'standing-me' : ''}`} key={p.id}>
          <span className={`rank rank-${p.rank}`}>
            {p.rank === 1 ? <Trophy size={17} /> : String(p.rank).padStart(2, '0')}
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
      <span className="countdown-number">
        {seconds ?? 'Ⅱ'}
        <small>SEC</small>
      </span>
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
