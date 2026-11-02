import type { CSSProperties } from 'react';
import { modeLabels, winRate, type MatchSnapshot, type Player } from '../../domain/match';
import { matchTeams } from '../../domain/teams';
import { playerColor, unitArtwork } from '../../games/aoe2/artwork';
import { CivilizationEmblem } from './CivilizationEmblem';
import { RatingImpact } from './RatingImpact';

export function CompactOverlay({ match }: { match: MatchSnapshot }) {
  const teams = matchTeams(match);
  return <section className="linear-overlay" aria-label="Dados da partida em modo compacto">
    <header className="linear-heading"><strong>{match.map}</strong><span className="linear-queue">{match.queue || modeLabels[match.mode]}</span><span className="linear-source">{match.source === 'live' ? 'AO VIVO' : match.replayOf ? 'REPLAY DE TESTE' : 'DEMONSTRAÇÃO'}</span></header>
    <div className={`linear-teams ${teams.length === 1 ? 'single-team' : ''}`}>
      {teams.map(team => <section className="linear-team" key={team.id} aria-label={team.label}>
        <h3>{team.label}</h3>
        {team.players.map(player => <CompactPlayer match={match} player={player} key={player.id} />)}
      </section>)}
    </div>
    <footer className="linear-footer"><span>Variações com ~ são estimativas não oficiais</span><span>{match.replayOf ? 'Dados sincronizados' : 'MATCHDECK'}</span></footer>
  </section>;
}

function CompactPlayer({ match, player }: { match: MatchSnapshot; player: Player }) {
  const artwork = unitArtwork(player);
  return <article className="linear-player" style={{ '--player-color': playerColor(player) } as CSSProperties}
    title={`${player.name} · ${player.civilization} · ${player.wins ?? '—'} V / ${player.losses ?? '—'} D · ${winRate(player)}`}>
    <span className="linear-color" aria-label={player.color ? `Cor ${player.color}` : 'Cor indisponível'}>{player.color ?? '·'}</span>
    <CivilizationEmblem key={artwork?.emblem ?? player.id} image={artwork?.emblem} civilization={player.civilization} />
    <strong className="linear-name">{player.name}</strong>
    <strong className="linear-rating" aria-label={`Rating ${player.rating ?? 'indisponível'}`}>{player.rating ?? '—'}</strong>
    <RatingImpact match={match} player={player} condensed />
  </article>;
}
