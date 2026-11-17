import { useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { api, json } from '../api';
import { Brand, DecoyArt, ErrorNotice, Footer } from '../components';

export function Login({
  initialError,
  onLogin,
}: {
  initialError: string;
  onLogin: () => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/host/login', { method: 'POST', body: json({ password }) });
      await onLogin();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="page-shell login-page">
      <header className="topbar">
        <Brand />
        <span className="header-note">The host has the best seat.</span>
      </header>
      <main className="login-layout">
        <div className="login-copy">
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
          <DecoyArt compact />
        </div>
        <form className="login-card sheet" onSubmit={login}>
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
}
