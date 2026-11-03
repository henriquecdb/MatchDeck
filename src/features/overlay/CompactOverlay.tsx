import { useI18n } from '../../i18n/LanguageProvider';
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
  const { t, language } = useI18n();
  const teams = matchTeams(match);
  return <section className="linear-overlay" aria-label={t('Dados da partida em modo compacto')}>
    <header className="linear-heading"><strong>{match.map}</strong><span className="linear-queue" title={`${t(ratingLabel(match))} · ${t(queueLabel(match))}`}>{t(queueLabel(match))}</span><span className="linear-source">{match.source === 'live' ? t('AO VIVO') : match.replayOf ? t('REPLAY DE TESTE') : t('DEMONSTRAÇÃO')}</span></header>
    <div className={`linear-teams ${teams.length === 1 ? 'single-team' : ''}`}>
      {teams.map(team => <section className="linear-team" key={team.id} aria-label={t(team.label)}>
        <h3>{t(team.label)}</h3>
        {team.players.map(player => <CompactPlayer match={match} player={player} key={player.id} showProjection={showProjection} display={display} />)}
      </section>)}
    </div>
    <footer className="linear-footer"><span>{showProjection && !match.finishedAt ? t('Variações com ~ são estimativas não oficiais') : 'MATCHDECK'}</span><span>{syncLabel(match, language)}</span></footer>
  </section>;
}

function CompactPlayer({ match, player, showProjection, display }: { match: MatchSnapshot; player: Player; showProjection: boolean; display: OverlaySettings }) {
  const { t, gameLanguage } = useI18n();
  const artwork = gameIntegration(match.gameId)?.artwork(player, gameLanguage);
  return <article className={`linear-player${display.highlightSelf && player.id === match.selfPlayerId ? ' is-self' : ''}`} style={{ '--player-color': playerColor(player), gridTemplateColumns: `14px 24px minmax(0,1fr) ${display.showRating ? '40px ' : ''}${showProjection || match.finishedAt ? '74px' : ''}` } as CSSProperties}
    title={`${player.name} · ${artwork?.name || player.civilization}${display.showRecord ? ` · ${player.wins ?? '—'} ${t('V')} / ${player.losses ?? '—'} ${t('D')}` : ''}${display.showWinRate ? ` · ${winRate(player)}` : ''}`}>
    <span className="linear-color" aria-label={player.color ? t('Cor {0}', { 0: player.color }) : t('Cor indisponível')}>{player.color ?? '·'}</span>
    <CivilizationEmblem key={artwork?.emblem ?? player.id} image={artwork?.emblem} civilization={artwork?.name || player.civilization} />
    <strong className="linear-name">{display.highlightSelf && player.id === match.selfPlayerId && <span className="self-marker">{t('Você ·')} </span>}{player.name}</strong>
    {display.showRating && <strong className="linear-rating" title={player.rating == null ? t(missingStats) : t(ratingLabel(match))} aria-label={`${t(ratingLabel(match))} ${player.rating ?? t('indisponível')}`}>{player.rating ?? '—'}</strong>}
    <RatingImpact match={match} player={player} condensed showProjection={showProjection} />
  </article>;
}
