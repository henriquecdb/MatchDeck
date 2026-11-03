import { useEffect, useState } from 'react';
import { defaultSettings } from '../domain/settings';
import type { AppState, OverlayRuntime } from './runtime';
import { defaultDetection } from '../domain/detection';
import { defaultPreferences } from '../domain/preferences';

export function useRuntime(runtime: OverlayRuntime) {
  const [state, setState] = useState<AppState>({ match: null, settings: defaultSettings, detection: defaultDetection, shortcutAvailable: false, visibilityShortcutAvailable: false, hiddenMatchId: null, lastSynced: null, preferences: defaultPreferences, autostart: false, trayAvailable: false, closeRequested: false, startupMs: null, appError: null });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setReady(false);
    setError(null);
    let disposed = false;
    let receivedUpdate = false;
    let unsubscribe: (() => void) | undefined;
    const timeout = setTimeout(() => { if (!disposed) setError('A inicialização está demorando mais que o esperado. Você pode tentar novamente.'); }, 15000);
    void (async () => {
      try {
        unsubscribe = await runtime.subscribe(next => {
          receivedUpdate = true;
          if (!disposed) setState(next);
        });
        if (disposed) { unsubscribe(); return; }
        const initial = await runtime.read();
        if (!disposed) {
          clearTimeout(timeout);
          if (!receivedUpdate) setState(initial);
          setError(null);
          setReady(true);
          if (!new URLSearchParams(location.search).has('window')) void runtime.initialized(performance.now()).catch(console.error);
        }
      } catch (cause) {
        clearTimeout(timeout);
        if (!disposed) setError(String(cause));
      }
    })();
    return () => { disposed = true; clearTimeout(timeout); unsubscribe?.(); };
  }, [runtime, attempt]);

  async function perform(action: () => Promise<void>) {
    setError(null);
    try { await action(); } catch (cause) { setError(String(cause)); }
  }

  return { state, ready, error, perform, retry: () => setAttempt(value => value + 1) };
}
