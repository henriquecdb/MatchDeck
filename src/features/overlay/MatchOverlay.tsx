import { useI18n } from '../../i18n/LanguageProvider';
import { winRate, type MatchSnapshot } from '../../domain/match';
import { missingStats, queueLabel, ratingLabel } from '../../domain/match-labels';
import type { CSSProperties } from 'react';
import { playerColor } from '../../domain/player-color';
import { gameIntegration } from '../../games/registry';
import { UnitPortrait } from './UnitPortrait';
import { RatingImpact } from './RatingImpact';
import { defaultSettings, type OverlaySettings } from '../../domain/settings';
import { CompactOverlay } from './CompactOverlay';
import { resolveOverlayLayout } from '../../domain/overlay-layout';
import { Aoe4Overlay } from '../../games/aoe4/Aoe4Overlay';

export function MatchOverlay({ match, layout = 'detailed', showProjection = true, display = defaultSettings }: { match: MatchSnapshot; layout?: OverlaySettings['layout']; showProjection?: boolean; display?: OverlaySettings }) {
  const { t, gameLanguage } = useI18n();
  if (match.gameId === 'aoe4') return <Aoe4Overlay match={match} display={display} />;
  const activeLayout = resolveOverlayLayout(layout, match);
  if (activeLayout !== 'detailed') return <CompactOverlay match={match} stacked={activeLayout === 'stacked'} showProjection={showProjection} display={display} />;
  return <section className="match-overlay layout-detailed" aria-label={t('Dados da partida')}>
    <header className="overlay-heading">
      <div><strong className="overlay-brand">MATCH<span>DECK</span></strong><span className="match-source">{match.source === 'demo' ? (match.replayOf ? t('REPLAY DE TESTE') : t('DEMONSTRAÇÃO')) : t('AO VIVO')}</span></div>
      <div className="match-context"><strong>{match.map}</strong><span>{t(queueLabel(match))}</span></div>
    </header>
    <div className="player-list">{match.players.map((player, index) => {
      const artwork = gameIntegration(match.gameId)?.artwork(player, gameLanguage);
      const rate = winRate(player);
      const style = { '--player-color': playerColor(player), '--win-angle': `${rate === '—' ? 0 : parseFloat(rate) * 3.6}deg` } as CSSProperties;
      return <article className={`player${display.highlightSelf && player.id === match.selfPlayerId ? ' is-self' : ''}`} key={player.id} style={style}>
        <div className="portrait-area"><UnitPortrait key={artwork?.image ?? player.id} image={artwork?.image} name={artwork?.units[0] ?? player.uniqueUnits[0] ?? player.civilization} /></div>
        <div className="player-content">
          <div className="player-name"><span className="player-slot" title={t('Cor na partida')}>{player.color ?? index + 1}</span><strong title={player.name}>{player.name}</strong></div>
          {display.highlightSelf && player.id === match.selfPlayerId && <span className="self-marker">{t('Você')}</span>}
          <div className="civilization-name">{artwork?.name || player.civilization}</div>
          <div className="unit-name" title={artwork?.units.join(', ') || player.uniqueUnits.join(', ')}>{artwork?.units[0] || player.uniqueUnits[0] || t('Unidade não catalogada')}</div>
          {display.showRecord && <div className="player-results" title={player.wins == null || player.losses == null ? t(missingStats) : t('Vitórias e derrotas na fila desta partida')}><span className="wins">{player.wins ?? '—'} <small>{t('V')}</small></span><span className="losses">{player.losses ?? '—'} <small>{t('D')}</small></span></div>}
          <RatingImpact match={match} player={player} showProjection={showProjection} />
        </div>
        <div className="player-numbers">{display.showRating && <><span className="stat-label" title={t(ratingLabel(match))}>{match.mode === 'quick' ? t('RATING RÁPIDAS') : match.mode === 'ranked' ? t('RATING RANKED') : "RATING"}</span><strong className="rating" title={player.rating == null ? t(missingStats) : `${t(ratingLabel(match))} · ${t(queueLabel(match))}`}>{player.rating ?? '—'}</strong></>}{display.showWinRate && <><div className="win-rate" title={rate === '—' ? t(missingStats) : t('Porcentagem de vitórias na fila desta partida')}><span>{rate}</span></div><span className="stat-label">{t('VITÓRIAS')}</span></>}</div>
      </article>;
    })}</div>
    {!match.finishedAt && showProjection && <div className="rating-disclaimer">{t('~ Projeção Elo orientativa · não oficial')}</div>}
  </section>;
}
