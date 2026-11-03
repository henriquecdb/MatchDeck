import type { CSSProperties } from 'react';
import { winRate, type MatchSnapshot, type Player } from '../../domain/match';
import { missingStats, queueLabel, ratingLabel, syncLabel } from '../../domain/match-labels';
import { matchTeams } from '../../domain/teams';
import { playerColor } from '../../domain/player-color';
import { gameIntegration } from '../../games/registry';
import { defaultSettings, type OverlaySettings } from '../../domain/settings';
import { CivilizationEmblem } from './CivilizationEmblem';
import { RatingImpact } from './RatingImpact';

export function CompactOverlay({ match, showProjection = true, display = defaultSettings }: { match: MatchSnapshot; showProjection?: boolean; display?: OverlaySettings }) {
  const teams = matchTeams(match);
  return <section className="linear-overlay" aria-label="Dados da partida em modo compacto">
    <header className="linear-heading"><strong>{match.map}</strong><span className="linear-queue" title={`${ratingLabel(match)} · ${queueLabel(match)}`}>{queueLabel(match)}</span><span className="linear-source">{match.source === 'live' ? 'AO VIVO' : match.replayOf ? 'REPLAY DE TESTE' : 'DEMONSTRAÇÃO'}</span></header>
    <div className={`linear-teams ${teams.length === 1 ? 'single-team' : ''}`}>
      {teams.map(team => <section className="linear-team" key={team.id} aria-label={team.label}>
        <h3>{team.label}</h3>
        {team.players.map(player => <CompactPlayer match={match} player={player} key={player.id} showProjection={showProjection} display={display} />)}
      </section>)}
    </div>
    <footer className="linear-footer"><span>{showProjection && !match.finishedAt ? 'Variações com ~ são estimativas não oficiais' : 'MATCHDECK'}</span><span>{syncLabel(match)}</span></footer>
  </section>;
}

function CompactPlayer({ match, player, showProjection, display }: { match: MatchSnapshot; player: Player; showProjection: boolean; display: OverlaySettings }) {
  const artwork = gameIntegration(match.gameId)?.artwork(player);
  return <article className={`linear-player${display.highlightSelf && player.id === match.selfPlayerId ? ' is-self' : ''}`} style={{ '--player-color': playerColor(player), gridTemplateColumns: `14px 24px minmax(0,1fr) ${display.showRating ? '40px ' : ''}${showProjection || match.finishedAt ? '74px' : ''}` } as CSSProperties}
    title={`${player.name} · ${artwork?.name || player.civilization}${display.showRecord ? ` · ${player.wins ?? '—'} V / ${player.losses ?? '—'} D` : ''}${display.showWinRate ? ` · ${winRate(player)}` : ''}`}>
    <span className="linear-color" aria-label={player.color ? `Cor ${player.color}` : 'Cor indisponível'}>{player.color ?? '·'}</span>
    <CivilizationEmblem key={artwork?.emblem ?? player.id} image={artwork?.emblem} civilization={artwork?.name || player.civilization} />
    <strong className="linear-name">{display.highlightSelf && player.id === match.selfPlayerId && <span className="self-marker">Você · </span>}{player.name}</strong>
    {display.showRating && <strong className="linear-rating" title={player.rating == null ? missingStats : ratingLabel(match)} aria-label={`${ratingLabel(match)} ${player.rating ?? 'indisponível'}`}>{player.rating ?? '—'}</strong>}
    <RatingImpact match={match} player={player} condensed showProjection={showProjection} />
  </article>;
}
