import { usePostGame } from './use-post-game';
import { Sc2PostGameCard } from '../../games/sc2/Sc2PostGameCard';
import { LanguageProvider, useI18n } from '../../i18n/LanguageProvider';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { MatchOverlay } from './MatchOverlay';
import { sc2DemoSession } from '../../games/sc2/demo';
import { useSc2Session } from '../../games/sc2/use-sc2-session';

export function OverlayWindow({ runtime }: { runtime: OverlayRuntime }) {
  const { state, error } = useRuntime(runtime);
  return <LanguageProvider preferences={state.preferences}><OverlayContent runtime={runtime} state={state} error={error} /></LanguageProvider>;
}

function OverlayContent({ runtime, state, error }: { runtime: OverlayRuntime; state: ReturnType<typeof useRuntime>['state']; error: string | null }) {
  const { t } = useI18n();
  const profileId = state.detection.config.profile?.profileId ?? null;
  const session = useSc2Session(runtime, profileId, state.detection.config.gameId === 'sc2' && state.settings.showSession);
  const card = usePostGame(state);
  if (error) return <p role="alert">{t(error)}</p>;
  if (!state.match && !card) return null;
  return <div style={{ opacity: state.settings.opacity, zoom: state.settings.scale }} onPointerDown={event => {
    if (!state.settings.locked && event.button === 0) void (async () => {
      if (state.settings.anchor !== 'manual' || state.settings.monitorId) {
        const position = await getCurrentWindow().outerPosition();
        await runtime.configure({ ...state.settings, x: position.x, y: position.y, anchor: 'manual', monitorId: null }, state.detection.config.gameId);
      }
      await getCurrentWindow().startDragging();
    })().catch(console.error);
  }}>{card ? <Sc2PostGameCard game={card.game} session={state.settings.showSession ? card.game.source === 'demo' ? sc2DemoSession : session : null} /> : state.match && <MatchOverlay match={state.match} layout={state.settings.layout} showProjection={state.settings.showProjection} display={state.settings} session={session} />}</div>;
}
