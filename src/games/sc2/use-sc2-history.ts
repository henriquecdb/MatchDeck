import { useEffect, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import type { Sc2History } from '../../domain/sc2-session';

export function useSc2History(runtime: OverlayRuntime, profileId: number | null, active: boolean) {
  const [history, setHistory] = useState<Sc2History | null>(null);

  useEffect(() => {
    if (!active || profileId == null) {
      setHistory(null);
      return;
    }
    let disposed = false;
    let updated = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        unsubscribe = await runtime.subscribeSc2History(next => {
          if (!disposed && next.profileId === profileId) {
            updated = true;
            setHistory(next);
          }
        });
        if (disposed) { unsubscribe(); return; }
        const current = await runtime.sc2History(profileId);
        if (!disposed && !updated) setHistory(current);
      } catch (cause) {
        if (!disposed) console.error(cause);
      }
    })();
    return () => { disposed = true; unsubscribe?.(); };
  }, [runtime, profileId, active]);

  return active && history?.profileId === profileId ? history : null;
}
