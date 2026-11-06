import { useI18n } from '../../i18n/LanguageProvider';
import type { MatchSnapshot } from '../../domain/match';
import { queueLabel } from '../../domain/match-labels';

export function LastResult({ match }: { match: MatchSnapshot | null }) {
  const { t, language } = useI18n();
  if (!match?.finishedAt || match.source !== 'live') return null;
  const self = match.players.find(player => player.id === match.selfPlayerId);
  const title = match.gameId === 'sc2' && self?.won == null && !self?.draw ? 'Última partida encerrada' : 'Último resultado confirmado';
  return <section className="session-summary" aria-label={t(title)}><h2>{t(title)}</h2><strong>{match.map} · {t(queueLabel(match))}</strong>
    <span>{new Date(match.finishedAt).toLocaleString(language)}</span>
    <ul>{match.players.map(player => <li key={player.id}>{player.id === match.selfPlayerId && <strong>{t('Você ·')} </strong>}{player.name}: {player.draw ? t('empate') : player.won === true ? <strong className="match-result-win">{t('vitória')}</strong> : player.won === false ? <strong className="match-result-loss">{t('derrota')}</strong> : t('resultado não informado')}  {t(match.gameId === 'sc2' ? '· MMR inicial' : '· Rating inicial')} {player.rating ?? '—'}  {t('· Variação')} {player.ratingChange == null ? t('não informada') : `${player.ratingChange >= 0 ? '+' : ''}${player.ratingChange}`}</li>)}</ul>
    <p>{t(match.warnings?.includes('Resultado confirmado por replay local.') ? 'Resultado confirmado por replay local.' : match.gameId === 'sc2' ? 'Resultado local do SC2. A variação de MMR pode não estar disponível.' : 'Variação confirmada pela fonte; rating inicial preservado.')}</p>
    {match.warnings?.filter(warning => warning !== 'Resultado confirmado por replay local.').map(warning => <p role="status" key={warning}>{t(warning)}</p>)}
  </section>;
}
