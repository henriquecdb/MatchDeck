import { useEffect, useMemo, useRef, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import { ProfileRepository } from '../../application/profile-repository';
import type { PlayerProfile } from '../../domain/detection';
import { profileWinRate, type ProfileOverview } from '../../domain/profile';
import { supportsRatingHistory } from '../../domain/rating-history';
import { RatingHistory } from './RatingHistory';
import { profileQueueLabel, profileRatingLabel } from '../../domain/match-labels';
import { useI18n } from '../../i18n/LanguageProvider';
import { gameIntegration } from '../../games/registry';
import { CivilizationEmblem } from '../overlay/CivilizationEmblem';

interface Props {
  gameId?: string;
  runtime: OverlayRuntime;
  profile: PlayerProfile | null;
  visible: boolean;
  desktop: boolean;
  onLink(): void;
}

export function ProfilePanel({ runtime, profile, visible, desktop, onLink, gameId = 'aoe2-de' }: Props) {
  const { t, language, gameLanguage } = useI18n();
  const repository = useMemo(() => new ProfileRepository(() => runtime.profileOverview()), [runtime]);
  const [refresh, setRefresh] = useState(0);
  const [queue, setQueue] = useState<string | null>(null);
  const lastRefresh = useRef(0);
  const [view, setView] = useState<{ id: number; data: ProfileOverview | null; busy: boolean; error: string | null } | null>(null);
  const profileId = profile?.profileId;
  useEffect(() => {
    if (!visible || !desktop || !profileId) return;
    let disposed = false;
    const force = refresh !== lastRefresh.current;
    lastRefresh.current = refresh;
    setView({ id: profileId, data: repository.peek(profileId), busy: true, error: null });
    void repository.load(profileId, force).then(data => {
      if (!disposed) setView({ id: profileId, data, busy: false, error: null });
    }).catch(cause => {
      if (!disposed) setView({ id: profileId, data: repository.peek(profileId), busy: false, error: cause instanceof Error ? cause.message : String(cause) });
    });
    return () => { disposed = true; };
  }, [repository, profileId, visible, desktop, refresh]);

  const current = view?.id === profileId ? view : null;
  const data = current?.data;
  const selectedBoard = data?.leaderboards.find(board => board.leaderboardId === queue)
    ?? data?.leaderboards.find(board => board.leaderboardId === data.recentMatches[0]?.queueId)
    ?? data?.leaderboards[0];
  const winRate = selectedBoard ? profileWinRate(selectedBoard) : null;
  const chartUnavailable = data?.warnings?.includes('Gráfico indisponível.') && !selectedBoard?.ratingHistory?.length;
  const historyUnavailable = data?.warnings?.includes('Histórico indisponível.');
  return <>
    <div className="section-heading"><h2>{t('Perfil')}</h2></div>
    {!desktop ? <p>{t('Estatísticas disponíveis no aplicativo Windows.')}</p> : !profile ? <div className="session-summary"><p>{t('Vincule seu perfil para ver estatísticas e partidas recentes.')}</p><button onClick={onLink}>{t('Vincular perfil')}</button></div> : <>
      <div className="profile-heading"><div><strong>{data?.name ?? profile.name}</strong><small>ID {profile.profileId}</small></div>
        <button disabled={current?.busy} onClick={() => setRefresh(value => value + 1)}>{t(current?.busy ? 'Atualizando…' : 'Atualizar perfil')}</button></div>
      {current?.busy && <p role="status">{t('Carregando estatísticas…')}</p>}
      {current?.error && <p role="alert" className="error">{t('Não foi possível atualizar o perfil.')} {t(current.error)}</p>}
      {data && <>
        {data.statsCache && <p className="profile-cache" role="status">{t(data.statsCache.stale ? 'Cache de {0}' : 'Consultado em {0}', { 0: new Date(data.statsCache.fetchedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' }) })}</p>}
        {data.warnings?.map(warning => <p key={warning} role="status">{t(warning)}</p>)}
        <section aria-label={t('Estatísticas por modalidade')}><h3>{t('Estatísticas por modalidade')}</h3>
          {selectedBoard ? <article className="profile-board"><label>{t('Modalidade')} <select value={selectedBoard.leaderboardId} onChange={event => setQueue(event.target.value)}>
            {data.leaderboards.map(board => <option key={board.leaderboardId} value={board.leaderboardId}>{t(profileQueueLabel(board.leaderboardId, gameId))}</option>)}
          </select></label><dl>
              <div><dt>{t(profileRatingLabel(selectedBoard.leaderboardId, gameId))}</dt><dd>{selectedBoard.rating ?? '—'}</dd></div>
              <div><dt>{t('Vitórias')}</dt><dd>{selectedBoard.wins ?? '—'}</dd></div>
              <div><dt>{t('Derrotas')}</dt><dd>{selectedBoard.losses ?? '—'}</dd></div>
              {!!selectedBoard.draws && <div><dt>{t('Empates')}</dt><dd>{selectedBoard.draws}</dd></div>}
              <div><dt>{t('Aproveitamento')}</dt><dd>{winRate == null ? '—' : `${winRate.toLocaleString(language, { maximumFractionDigits: 1 })}%`}</dd></div>
            </dl></article> : <p>{t('Sem estatísticas publicadas para este perfil.')}</p>}
        </section>
        {selectedBoard && !chartUnavailable && supportsRatingHistory(gameId, selectedBoard.leaderboardId) && <RatingHistory windowDays={gameId === 'sc2' ? 90 : undefined} key={selectedBoard.leaderboardId} board={selectedBoard} label={t(profileRatingLabel(selectedBoard.leaderboardId, gameId))} />}
        <section aria-label={t('Últimas 5 partidas')}><h3>{t('Últimas 5 partidas')}</h3>
          {data.recentMatches.length ? <ol className="profile-history">{data.recentMatches.map(match => {
            const artwork = gameIntegration(gameId)?.artwork({ civilizationId: match.civilizationId ?? undefined, civilization: match.civilization ?? '', uniqueUnits: [] }, gameLanguage);
            const civilization = artwork?.name ?? match.civilization ?? t('Civilização indisponível');
            return <li key={match.id} className={`history-match ${match.draw ? 'is-draw' : match.won === true ? 'is-win' : match.won === false ? 'is-loss' : 'is-unknown'}`}>
              <span className="history-result">{t(match.draw ? 'Empate' : match.won === true ? 'Vitória' : match.won === false ? 'Derrota' : 'Sem resultado')}</span>
              <div className="history-details"><strong>{t(match.map)}</strong><small>{t(profileQueueLabel(match.queueId, gameId))}</small><time dateTime={match.startedAt}>{new Date(match.startedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</time></div>
              <div className="history-civilization"><CivilizationEmblem image={artwork?.emblem} civilization={civilization} /><span>{civilization}</span></div>
              <span className="history-rating" title={t('Variação de rating')} aria-label={t('Variação de rating: {0}', { 0: match.ratingChange == null ? '—' : `${match.ratingChange > 0 ? '+' : ''}${match.ratingChange}` })}>{match.ratingChange == null ? '—' : `${match.ratingChange > 0 ? '+' : ''}${match.ratingChange}`}</span>
            </li>;
          })}</ol> : !historyUnavailable && <p>{t('Nenhuma partida encerrada publicada.')}</p>}
        </section>
        <details className="help-details"><summary>{t('Sobre estes dados')}</summary><p>{t(gameId === 'sc2' ? 'SC2 Pulse: MMR e estatísticas. Histórico: até 5 replays locais 1v1; sem arquivos locais, usamos as partidas publicadas. Matchmaking inclui ranked e unranked.' : gameId === 'aoe4' ? 'Fonte: AoE4 World. Até 5 partidas multiplayer encerradas entre as 10 mais recentes publicadas. Resultados podem atrasar ou estar privados.' : 'Fonte: AoE2 Companion. Até 5 partidas encerradas, da mais recente para a mais antiga. Resultados podem demorar a aparecer.')}</p><p>{t('Ratings e estatísticas são separados por modalidade. — indica dado indisponível; não significa zero.')}</p><p>{t('Cache de 1 minuto ao abrir esta aba. Use Atualizar perfil para consultar agora.')}</p><p>{t('Atualizado em {0}', { 0: new Date(data.fetchedAt).toLocaleString(language) })}</p></details>
      </>}
    </>}
  </>;
}
