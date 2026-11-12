import { useEffect, useState } from 'react';
import type { AppState } from '../../application/runtime';

export function usePostGame(state: AppState) {
  const [now, setNow] = useState(Date.now());
  const expiresAt = state.postGame?.expiresAt;
  useEffect(() => {
    setNow(Date.now());
    if (!expiresAt) return;
    const timeout = setTimeout(() => setNow(Date.now()), Math.max(0, Date.parse(expiresAt) - Date.now()) + 10);
    return () => clearTimeout(timeout);
  }, [expiresAt]);
  const card = state.postGame;
  const scoped = card?.game.source === 'demo' ? !state.detection.config.enabled : state.detection.config.enabled && card?.game.selfPlayerId === String(state.detection.config.profile?.profileId);
  return !state.match && card && scoped && state.hiddenMatchId !== card.game.id && state.settings.postGameSeconds > 0 && card.game.gameId === state.detection.config.gameId && Date.parse(card.expiresAt) > now ? card : null;
}
