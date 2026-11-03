import { useI18n } from '../../i18n/LanguageProvider';
import type { MatchSnapshot } from '../../domain/match';
import { queueLabel } from '../../domain/match-labels';

export function LastResult({ match }: { match: MatchSnapshot | null }) {
  const { t, language } = useI18n();
  if (!match?.finishedAt || match.source !== 'live') return null;
  return <section className="session-summary" aria-label={t('Último resultado confirmado')}><h2>{t('Último resultado confirmado')}</h2><strong>{match.map} · {t(queueLabel(match))}</strong>
    <span>{new Date(match.finishedAt).toLocaleString(language)}</span>
    <ul>{match.players.map(player => <li key={player.id}>{player.id === match.selfPlayerId && <strong>{t('Você ·')} </strong>}{player.name}: {player.won === true ? t('vitória') : player.won === false ? t('derrota') : t('resultado não informado')}  {t('· Rating inicial')} {player.rating ?? '—'}  {t('· Variação')} {player.ratingChange == null ? t('não informada') : `${player.ratingChange >= 0 ? '+' : ''}${player.ratingChange}`}</li>)}</ul>
    <p>{t('Resultado informado pela fonte. O rating inicial foi preservado; a variação é a confirmada para esta partida.')}</p>
    {match.warnings?.map(warning => <p role="status" key={warning}>{t(warning)}</p>)}
  </section>;
}
