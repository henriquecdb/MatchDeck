import type { OverlayRuntime } from '../../application/runtime';
import { sessionRecord } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';
import { useGameSession } from './use-game-session';
import { gameIntegration } from '../../games/registry';
export function GameSessionPanel({ runtime, gameId, profileId, active, matchActive }: { runtime: OverlayRuntime; gameId: string; profileId: number; active: boolean; matchActive: boolean }) {
  const { t, language, gameLanguage } = useI18n();
  const { session, ready, busy, error, change } = useGameSession(runtime, gameId, profileId, active);
  const running = session != null && !session.endedAt;
  const record = sessionRecord(session);
  return <section className="sc2-session" aria-label={t('Sessão')}>
    <div className="profile-heading"><h3>{t('Sessão')}</h3><button disabled={!ready || busy || matchActive} onClick={() => void change(running ? 'finish' : 'start')}>{t(running ? 'Encerrar sessão' : session ? 'Nova sessão' : 'Iniciar sessão')}</button></div>
    {error && <p className="error" role="alert">{t(error)} <button disabled={busy} onClick={() => void change('read')}>{t('Tentar novamente')}</button></p>}
    {session ? <>
      <p className="sc2-session-period">{t('Início')} {new Date(session.startedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}{session.endedAt && <> · {t('Fim')} {new Date(session.endedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</>}</p>
      <dl className="sc2-session-score" aria-live="polite"><div><dt>{t('Vitórias')}</dt><dd>{record.wins}</dd></div><div><dt>{t('Derrotas')}</dt><dd>{record.losses}</dd></div><div><dt>{t('Empates')}</dt><dd>{record.draws}</dd></div><div><dt>{t('Aproveitamento')}</dt><dd>{record.winRate == null ? '—' : record.winRate.toLocaleString(language, { maximumFractionDigits: 0 }) + '%'}</dd></div></dl>
      {session.matches.length ? <><h4>{t('Últimos resultados')}</h4><ol className="profile-history" aria-label={t('Últimos resultados')}>{session.matches.slice(0, 10).map(match => {
        const civ = gameIntegration(gameId)?.artwork({ civilization: match.civilization, civilizationId: match.civilization, uniqueUnits: [] }, gameLanguage);
        return <li key={match.id} className={'history-match ' + (match.draw ? 'is-draw' : match.won ? 'is-win' : 'is-loss')}>
          <span className="history-result">{t(match.draw ? 'Empate' : match.won ? 'Vitória' : 'Derrota')}</span><div className="history-details"><strong>{match.opponents.join(' × ') || '—'}</strong><small>{match.map} · {civ?.name ?? match.civilization}</small><time dateTime={match.startedAt} title={t('Início')}>{new Date(match.startedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</time></div>
          {match.ratingChange != null && <strong title={t('Variação de rating')}>{match.ratingChange > 0 ? '+' : ''}{match.ratingChange}</strong>}
        </li>;
      })}</ol></> : <p>{t('Aguardando a primeira partida.')}</p>}
    </> : <p>{t('Inicie a sessão antes de jogar.')}</p>}
    <details className="help-details"><summary>{t('Sobre a sessão')}</summary><p>{t('Resultados confirmados pela fonte. Salva por jogo e perfil.')}</p><p>{t('Nova sessão substitui o placar anterior.')}</p></details>
  </section>;
}
