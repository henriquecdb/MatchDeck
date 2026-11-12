import { useEffect, useRef, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import type { GameSession, GameSessionAction } from '../../domain/game-session';
export function useGameSession(runtime: OverlayRuntime, gameId: string, profileId: number | null, active: boolean) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0); const revision = useRef(0);
  useEffect(() => {
    const token = ++generation.current;
    setSession(null); setReady(false); setError(null); setBusy(false);
    if (!active || profileId == null || !['aoe2-de', 'aoe4'].includes(gameId)) return;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        unsubscribe = await runtime.subscribeGameSession(next => {
          if (generation.current === token && next.gameId === gameId && next.profileId === profileId) { revision.current++; setSession(next); setReady(true); }
        });
        if (generation.current !== token) { unsubscribe(); return; }
        const requested = revision.current;
        const current = await runtime.gameSession(gameId, profileId, 'read');
        if (generation.current === token) { if (requested === revision.current) setSession(current); setReady(true); }
      } catch (cause) { if (generation.current === token) setError(String(cause)); }
    })();
    return () => { generation.current++; unsubscribe?.(); };
  }, [runtime, gameId, profileId, active]);
  async function change(action: GameSessionAction) {
    if (profileId == null) return;
    const token = generation.current; const requested = revision.current;
    setBusy(true); setError(null);
    try {
      const next = await runtime.gameSession(gameId, profileId, action);
      if (token === generation.current) { if (requested === revision.current) setSession(next); setReady(true); }
    } catch (cause) { if (token === generation.current) setError(String(cause)); }
    finally { if (token === generation.current) setBusy(false); }
  }
  return { session: active && session?.gameId === gameId && session.profileId === profileId ? session : null, ready, busy, error, change };
}
