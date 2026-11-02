import { getCurrentWindow } from '@tauri-apps/api/window';
import type { OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { MatchOverlay } from './MatchOverlay';

export function OverlayWindow({ runtime }: { runtime: OverlayRuntime }) {
  const { state, error } = useRuntime(runtime);
  if (error) return <p role="alert">{error}</p>;
  if (!state.match) return null;
  return <div style={{ opacity: state.settings.opacity, zoom: state.settings.scale }} onPointerDown={event => {
    if (!state.settings.locked && event.button === 0) void (async () => {
      if (state.settings.anchor !== 'manual' || state.settings.monitorId) {
        const position = await getCurrentWindow().outerPosition();
        await runtime.configure({ ...state.settings, x: position.x, y: position.y, anchor: 'manual', monitorId: null });
      }
      await getCurrentWindow().startDragging();
    })().catch(console.error);
  }}><MatchOverlay match={state.match} layout={state.settings.layout} showProjection={state.settings.showProjection} /></div>;
}
