import { useEffect, useState } from 'react';
import { defaultSettings } from '../domain/settings';
import type { AppState, OverlayRuntime } from './runtime';
import { defaultDetection } from '../domain/detection';

export function useRuntime(runtime: OverlayRuntime) {
  const [state, setState] = useState<AppState>({ match: null, settings: defaultSettings, detection: defaultDetection, shortcutAvailable: false, lastSynced: null });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setReady(false);
    setError(null);
    let disposed = false;
    let receivedUpdate = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        unsubscribe = await runtime.subscribe(next => {
          receivedUpdate = true;
          if (!disposed) setState(next);
        });
        if (disposed) { unsubscribe(); return; }
        const initial = await runtime.read();
        if (!disposed) {
          if (!receivedUpdate) setState(initial);
          setReady(true);
        }
      } catch (cause) {
        if (!disposed) setError(String(cause));
      }
    })();
    return () => { disposed = true; unsubscribe?.(); };
  }, [runtime, attempt]);

  async function perform(action: () => Promise<void>) {
    setError(null);
    try { await action(); } catch (cause) { setError(String(cause)); }
  }

  return { state, ready, error, perform, retry: () => setAttempt(value => value + 1) };
}
