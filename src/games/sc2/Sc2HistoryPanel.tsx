import type { OverlayRuntime } from '../../application/runtime';
import { opponentRecords } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';
import { useSc2History } from './use-sc2-history';

export function Sc2HistoryPanel({ runtime, profileId, active }: { runtime: OverlayRuntime; profileId: number; active: boolean }) {
  const history = useSc2History(runtime, profileId, active);
  const { t, language } = useI18n();
  const opponents = history ? opponentRecords(history) : [];
  return <section className="sc2-session" aria-label={t('Confrontos')}><h3>{t('Confrontos')}</h3>
    <p>{t('Histórico local indexado')}</p>
    {opponents.length ? <ul className="sc2-opponents">{opponents.map(opponent => <li key={opponent.id}>
      <strong title={opponent.id}>{opponent.name}</strong>
      <span>{opponent.wins}{t('V')} · {opponent.losses}{t('D')}{opponent.draws > 0 && <> · {opponent.draws}{t('E')}</>}</span>
      <small>{opponent.total} {t('partidas')} · {new Date(opponent.lastPlayed).toLocaleDateString(language)}</small>
    </li>)}</ul> : <p>{t('Nenhum confronto indexado.')}</p>}
  </section>;
}
