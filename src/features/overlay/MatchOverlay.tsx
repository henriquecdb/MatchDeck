import { winRate, type MatchSnapshot } from '../../domain/match';
import { missingStats, queueLabel, ratingLabel, syncLabel } from '../../domain/match-labels';
import type { CSSProperties } from 'react';
import { playerColor, unitArtwork } from '../../games/aoe2/artwork';
import { UnitPortrait } from './UnitPortrait';
import { RatingImpact } from './RatingImpact';
import type { OverlaySettings } from '../../domain/settings';
import { CompactOverlay } from './CompactOverlay';

export function MatchOverlay({ match, layout = 'detailed', showProjection = true }: { match: MatchSnapshot; layout?: OverlaySettings['layout']; showProjection?: boolean }) {
  if (layout === 'compact') return <CompactOverlay match={match} showProjection={showProjection} />;
  return <section className="match-overlay layout-detailed" aria-label="Dados da partida">
    <header className="overlay-heading">
      <div><strong className="overlay-brand">MATCH<span>DECK</span></strong><span className="match-source">{match.source === 'demo' ? (match.replayOf ? 'REPLAY DE TESTE' : 'DEMONSTRAÇÃO') : 'AO VIVO'}</span></div>
      <div className="match-context"><strong>{match.map}</strong><span>{queueLabel(match)}</span></div>
    </header>
    <div className="player-list">{match.players.map((player, index) => {
      const artwork = unitArtwork(player);
      const rate = winRate(player);
      const style = { '--player-color': playerColor(player), '--win-angle': `${rate === '—' ? 0 : parseFloat(rate) * 3.6}deg` } as CSSProperties;
      return <article className="player" key={player.id} style={style}>
        <div className="portrait-area"><UnitPortrait key={artwork?.image ?? player.id} image={artwork?.image} name={artwork?.units[0] ?? player.uniqueUnits[0] ?? player.civilization} /></div>
        <div className="player-content">
          <div className="player-name"><span className="player-slot" title="Cor na partida">{player.color ?? index + 1}</span><strong title={player.name}>{player.name}</strong></div>
          <div className="civilization-name">{player.civilization}</div>
          <div className="unit-name" title={player.uniqueUnits.join(', ') || artwork?.units.join(', ')}>{player.uniqueUnits[0] || artwork?.units[0] || 'Unidade não catalogada'}</div>
          <div className="player-results" title={player.wins == null || player.losses == null ? missingStats : 'Vitórias e derrotas na fila desta partida'}><span className="wins">{player.wins ?? '—'} <small>V</small></span><span className="losses">{player.losses ?? '—'} <small>D</small></span></div>
          <RatingImpact match={match} player={player} showProjection={showProjection} />
        </div>
        <div className="player-numbers"><span className="stat-label" title={ratingLabel(match)}>{match.mode === 'quick' ? 'RATING RÁPIDAS' : match.mode === 'ranked' ? 'RATING RANKED' : 'RATING'}</span><strong className="rating" title={player.rating == null ? missingStats : `${ratingLabel(match)} · ${queueLabel(match)}`}>{player.rating ?? '—'}</strong><div className="win-rate" title={rate === '—' ? missingStats : 'Porcentagem de vitórias na fila desta partida'}><span>{rate}</span></div><span className="stat-label">VITÓRIAS</span></div>
      </article>;
    })}</div>
    {!match.finishedAt && showProjection && <div className="rating-disclaimer">~ Projeção Elo orientativa · não oficial</div>}
    <footer className="replay-caption">{syncLabel(match)}</footer>
  </section>;
}
