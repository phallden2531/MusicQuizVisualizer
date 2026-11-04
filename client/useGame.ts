import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameView, Result, Role } from '../shared/types';

export function useGame(role: Role, roomCode?: string, token?: string, active = true) {
  const [state, setState] = useState<GameView | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  const [offset, setOffset] = useState(0);
  const socket = useRef<Socket | null>(null);
  useEffect(() => {
    if (!active) return;
    const connection = io({
      auth: { role, roomCode, token },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socket.current = connection;
    connection.on('connect', () => {
      setConnected(true);
      setError('');
    });
    connection.on('disconnect', () => setConnected(false));
    connection.on('connect_error', (e) => {
      setError(e.message);
      setConnected(false);
    });
    connection.on('state', (snapshot: GameView | null) => {
      setState(snapshot);
      if (snapshot) setOffset(snapshot.serverNow - Date.now());
    });
    connection.on('game:closed', () => {
      setClosed(true);
      setError('This room has closed. Join the new room to play again.');
    });
    connection.on('session:expired', () => {
      setError('Host session expired. Sign in again.');
      setClosed(true);
    });
    return () => {
      connection.disconnect();
      socket.current = null;
      setConnected(false);
    };
  }, [role, roomCode, token, active]);
  const emit = useCallback(
    <T = void>(event: string, payload: object): Promise<T> =>
      new Promise((resolve, reject) => {
        if (!socket.current?.connected) {
          reject(new Error('Reconnecting. Please wait.'));
          return;
        }
        socket.current
          .timeout(10000)
          .emit(event, payload, (timeout: Error | null, result: Result<T>) => {
            if (timeout) reject(new Error('No response yet. Please try again.'));
            else if (!result.ok) reject(new Error(result.error));
            else resolve(result.data);
          });
      }),
    [],
  );
  return { state, connected, error, closed, emit, offset };
}
/** Server-aligned clock. Ticks only while something on screen counts down. */
export function useNow(offset = 0, ticking = true) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(timer);
  }, [ticking]);
  return Date.now() + offset;
}
