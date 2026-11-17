import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight } from 'lucide-react';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/permanent-marker/400.css';
import { Brand, DecoyArt, Footer, Ticket } from './components';
import { Host } from './Host';
import { Player } from './Player';
import { Presentation } from './Presentation';
import './styles.css';

function Home() {
  const [room, setRoom] = useState('');
  return (
    <div className="home page-shell">
      <header className="topbar">
        <Brand />
        <a className="text-link" href="/host">
          Host a quiz <ArrowRight size={16} />
        </a>
      </header>
      <main className="home-grid">
        <div className="home-copy">
          <h1>
            You know the song.
            <br />
            <em>Do you know the person?</em>
          </h1>
          <p className="intro">
            Original songs. Familiar faces. A few misleading names. Read between the lyrics and find
            your colleague.
          </p>
          <Ticket className="join-code">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (room.trim())
                  location.href = `/join/${encodeURIComponent(room.trim().toUpperCase())}`;
              }}
            >
              <label htmlFor="room-code">Got an invitation?</label>
              <div>
                <input
                  id="room-code"
                  aria-label="Room code"
                  placeholder="ROOM CODE"
                  maxLength={6}
                  value={room}
                  onChange={(e) => setRoom(e.target.value.toUpperCase())}
                  required
                />
                <button className="button button-primary" type="submit">
                  Join the room <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </Ticket>
          <p className="home-note">One room. Up to 15 music detectives. Zero downloads.</p>
        </div>
        <DecoyArt />
      </main>
      <Footer />
    </div>
  );
}
function App() {
  const path = location.pathname;
  if (path === '/host' || path.startsWith('/host/')) return <Host />;
  if (path.startsWith('/join/'))
    return <Player roomCode={decodeURIComponent(path.split('/')[2] || '').toUpperCase()} />;
  if (path.startsWith('/screen/'))
    return <Presentation roomCode={decodeURIComponent(path.split('/')[2] || '').toUpperCase()} />;
  return <Home />;
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
