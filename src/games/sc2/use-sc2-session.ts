import { useEffect, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import type { Sc2Session } from '../../domain/sc2-session';

export function useSc2Session(runtime: OverlayRuntime, profileId: number | null, active: boolean) {
  const [session, setSession] = useState<Sc2Session | null>(null);

  useEffect(() => {
    if (!active || profileId == null) {
      setSession(null);
      return;
    }
    let disposed = false;
    let updated = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        unsubscribe = await runtime.subscribeSc2Session(next => {
          if (!disposed && next.profileId === profileId) {
            updated = true;
            setSession(next);
          }
        });
        if (disposed) { unsubscribe(); return; }
        const current = await runtime.sc2Session(profileId, 'read');
        if (!disposed && !updated) setSession(current);
      } catch (cause) {
        if (!disposed) console.error(cause);
      }
    })();
    return () => { disposed = true; unsubscribe?.(); };
  }, [runtime, profileId, active]);

  return active && session?.profileId === profileId ? session : null;
}
