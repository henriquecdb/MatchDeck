import type { MatchSnapshot } from '../../domain/match';
import { winRate } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { useI18n } from '../../i18n/LanguageProvider';
import { civilizationArtwork, leagueBadge } from './catalog';

export function Aoe4Overlay({ match, display }: { match: MatchSnapshot; display: OverlaySettings }) {
  const { t, gameLanguage } = useI18n();
  return <section className="aoe4-overlay" aria-label={t('Overlay Age of Empires IV')}>
    {match.players.map((player, index) => {
      const civ = civilizationArtwork(player, gameLanguage);
      return <article key={player.id} className={`aoe4-player player-${index}${display.highlightSelf && player.id === match.selfPlayerId ? ' aoe4-self' : ''}`}>
        <img className="aoe4-flag" src={civ.emblem} alt={civ.name} title={civ.name} />
        <img className="aoe4-league" src={leagueBadge(player.rankLevel)} alt={player.rankLevel?.replaceAll('_', ' ') ?? t('Liga indisponível')} />
        <div className="aoe4-player-info"><strong className="aoe4-name" title={player.name}>{player.name}</strong>
          <div className="aoe4-stats">
            <span title={t('Posição no ranking')}>#{player.rank ?? '—'}</span>
            {display.showRating && <b title={t(match.mode === 'ranked' ? 'Pontos ranqueados' : 'Rating de partidas rápidas')}>{player.rating ?? '—'}</b>}
            {display.showRecord && <><span className="wins">{player.wins ?? '—'}{t('V')}</span><span className="losses">{player.losses ?? '—'}{t('D')}</span></>}
            {display.showWinRate && <span>{winRate(player)}</span>}
          </div>
        </div>
      </article>;
    })}
    <div className="aoe4-context"><strong title={match.map}>{match.map}</strong><span>{match.queue ?? (match.mode === 'ranked' ? 'RM 1v1' : 'QM 1v1')}{match.source === 'demo' ? ` · ${t('Teste')}` : ''}</span></div>
  </section>;
}
