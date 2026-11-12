import { useEffect, useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { previousEncounter, type Sc2Encounter, type Sc2History } from '../../domain/sc2-session';

export function useSc2Encounter(runtime: OverlayRuntime, card: AppState['postGame']) {
  const [record, setRecord] = useState<{ key: string; value: Sc2Encounter | null } | null>(null);
  const key = card ? card.game.id + ':' + card.opponentId : '';
  useEffect(() => {
    if (!card || card.game.source === 'demo' || !card.opponentId || !card.game.selfPlayerId) return;
    const profileId = Number(card.game.selfPlayerId);
    if (!Number.isSafeInteger(profileId)) return;
    let disposed = false;
    let updated = false;
    let unsubscribe: (() => void) | undefined;
    const apply = (history: Sc2History) => {
      if (!disposed && history.profileId === profileId) setRecord({ key, value: previousEncounter(history, card.opponentId!, card.game) });
    };
    void (async () => {
      try {
        unsubscribe = await runtime.subscribeSc2History(history => { if (history.profileId === profileId) { updated = true; apply(history); } });
        if (disposed) { unsubscribe(); return; }
        const history = await runtime.sc2History(profileId);
        if (!updated) apply(history);
      } catch (error) { if (!disposed) console.error(error); }
    })();
    return () => { disposed = true; unsubscribe?.(); };
  }, [runtime, key]);
  if (card?.game.source === 'demo') return demoEncounter(card.game.finishedAt);
  return record?.key === key ? record.value : null;
}

export function demoEncounter(finishedAt?: string | null): Sc2Encounter {
  return { id: 'demo', name: 'Orion', wins: 3, losses: 2, draws: 0, total: 5, winRate: 60, lastPlayed: new Date(Date.parse(finishedAt ?? new Date().toISOString()) - 86400000).toISOString() };
}
