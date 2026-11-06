import { useEffect, useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { useI18n } from '../../i18n/LanguageProvider';
import { LastResult } from './LastResult';

export function LatestResult({ runtime, state, active }: { runtime: OverlayRuntime; state: AppState; active: boolean }) {
  const { t } = useI18n();
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileId = state.detection.config.profile?.profileId;
  const result = state.lastSynced?.selfPlayerId === String(profileId) ? state.lastSynced : null;
  useEffect(() => {
    if (!active || !profileId || attempted || state.match || result?.finishedAt) return;
    setAttempted(true);
    setLoading(true);
    void runtime.syncLatest(true).catch(cause => { setError(String(cause)); })
      .finally(() => { setLoading(false); });
  }, [runtime, active, profileId, attempted, state.match, result?.finishedAt]);
  return <>
    <LastResult match={result} />
    {loading && <p role="status">{t('Buscando último resultado…')}</p>}
    {error && <p role="status">{t(error)}</p>}
  </>;
}
