import type { MatchSnapshot } from '../../domain/match';
import { winRate } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { useI18n } from '../../i18n/LanguageProvider';
import { raceArtwork } from './catalog';
import type { Sc2Session } from '../../domain/sc2-session';
import { sc2DemoSession } from './demo';
import { Sc2SessionBar } from './Sc2SessionBar';

export function Sc2Overlay({ match, display, session = null }: { match: MatchSnapshot; display: OverlaySettings; session?: Sc2Session | null }) {
  const { t, language, gameLanguage } = useI18n();
  const liveSession = session?.endedAt == null && String(session?.profileId) === match.selfPlayerId ? session : null;
  const currentSession = match.source === 'demo' ? sc2DemoSession : liveSession;
  const showSession = display.showSession && currentSession != null;
  return <section className={`sc2-overlay${showSession ? ' has-session' : ''}`} aria-label={t('Overlay StarCraft II')}>
    <header>
      <span>{t(match.queue ?? '1v1 · fila não informada')}</span>
      {match.source === 'demo' && <small>{t('DEMONSTRAÇÃO')}</small>}
    </header>
    <div className="sc2-players">{match.players.map(player => {
      const artwork = raceArtwork(player, gameLanguage);
      const fetchedAt = player.statsCache ? new Date(player.statsCache.fetchedAt) : null;
      const cacheTitle = fetchedAt ? t('Cache de {0}', { 0: fetchedAt.toLocaleString(language) }) : undefined;
      const cacheLabel = fetchedAt && player.ratingChange == null
        ? 'Cache ' + fetchedAt.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })
        : 'Cache';
      return <article key={player.id} className={display.highlightSelf && match.selfPlayerId === player.id ? 'is-self' : ''}>
        <img src={artwork.emblem} alt={artwork.name} className="sc2-race" />
        <div className="sc2-identity">
          <strong title={player.name}>{player.name}</strong>
          <small title={player.identityHint ? t('Perfil sugerido por nome e região; o cliente não informa o ID global do adversário.') : undefined}>
            {player.identityHint && <>{t('Perfil sugerido')} · </>}
            {artwork.name}{player.rankLevel ? ' · ' + t(player.rankLevel) : ''}
          </small>
        </div>
        {display.showRecord && <span className="sc2-record"><b>{player.wins ?? '—'}{t('V')}</b> <b>{player.losses ?? '—'}{t('D')}</b>{!!player.draws && <span> {player.draws}{t('E')}</span>}</span>}
        {display.showWinRate && <span className="sc2-winrate">{winRate(player)}</span>}
        {display.showRating && <div className="sc2-mmr" title={t('MMR ranqueado da raça, publicado pelo SC2 Pulse') + (fetchedAt ? ' · ' + t('Consultado em {0}', { 0: fetchedAt.toLocaleString(language) }) : '')}>
          <strong>{player.identityHint && player.mmr != null && <small>?</small>}{player.mmr ?? '—'}</strong>
          {(player.ratingChange != null || player.statsCache?.stale) && <span>
            {player.ratingChange != null && <>{player.ratingChange > 0 ? '+' : ''}{player.ratingChange}</>}
            {player.ratingChange != null && player.statsCache?.stale && ' · '}
            {player.statsCache?.stale && <span className="sc2-cache" title={cacheTitle}>{cacheLabel}</span>}
          </span>}
        </div>}
        {!display.showRating && (display.showRecord || display.showWinRate) && player.statsCache?.stale &&
          <span className="sc2-cache" title={cacheTitle}>Cache</span>}
      </article>;
    })}</div>
    {(display.showRating || display.showRecord || display.showWinRate) &&
      <footer title={t('Estatísticas ranqueadas por raça · fonte SC2 Pulse')}>{display.showRating && <strong>MMR · </strong>}SC2 Pulse · {t('Por raça')}</footer>}
    {showSession && <Sc2SessionBar session={currentSession} />}
  </section>;
}
