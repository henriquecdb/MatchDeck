import { getCurrentWindow } from '@tauri-apps/api/window';
import type { OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { MatchOverlay } from './MatchOverlay';

export function OverlayWindow({ runtime }: { runtime: OverlayRuntime }) {
  const { state, error } = useRuntime(runtime);
  if (error) return <p role="alert">{error}</p>;
  if (!state.match) return null;
  return <div style={{ opacity: state.settings.opacity }} onPointerDown={event => {
    if (!state.settings.locked && event.button === 0) void getCurrentWindow().startDragging().catch(console.error);
  }}><MatchOverlay match={state.match} layout={state.settings.layout} /></div>;
}
