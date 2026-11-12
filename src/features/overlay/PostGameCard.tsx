import type { MatchSnapshot } from '../../domain/match';
import type { GameSession } from '../../domain/game-session';
import { sessionBarData, sessionForMatch } from '../../domain/game-session';
import type { Sc2Encounter, Sc2Session } from '../../domain/sc2-session';
import { Sc2PostGameCard } from '../../games/sc2/Sc2PostGameCard';
import { SessionBar } from '../session/SessionBar';
import { useI18n } from '../../i18n/LanguageProvider';
export function PostGameCard({ game, session = null, gameSession = null, encounter = null, showSession = true }: { game: MatchSnapshot; session?: Sc2Session | null; gameSession?: GameSession | null; encounter?: Sc2Encounter | null; showSession?: boolean }) {
  const { t } = useI18n();
  if (game.gameId === 'sc2') return <Sc2PostGameCard game={game} session={showSession ? session : null} encounter={encounter} />;
  const own = game.players.find(p => p.id === game.selfPlayerId);
  const opponents = own?.teamId != null ? game.players.filter(p => p.teamId !== own.teamId).map(p => p.name).join(' × ') : game.players.length === 2 ? game.players.find(p => p.id !== game.selfPlayerId)?.name : t('Partida em equipe');
  const active = sessionForMatch(gameSession, game);
  const bar = active && { ...active, matches: game.source === 'demo' ? [{ gameId: game.gameId, profileId: 0, id: game.id, startedAt: game.finishedAt ?? new Date().toISOString(), finishedAt: game.finishedAt ?? null, observedAt: new Date().toISOString(), map: game.map, queueId: game.queueId ?? null, civilization: own?.civilization ?? '', opponents: [opponents ?? ''], won: own?.won ?? null, draw: own?.draw === true, ratingChange: own?.ratingChange ?? null, durationSeconds: game.durationSeconds ?? null }, ...active.matches] : active.matches };
  const seconds = game.durationSeconds;
  return <section className={'sc2-post-game ' + (own?.draw ? 'is-draw' : own?.won ? 'is-win' : 'is-loss')} aria-label={t('Resumo pós-partida')}>
    {game.source === 'demo' && <small>{t('DEMONSTRAÇÃO')}</small>}
    <header><strong>{t(own?.draw ? 'Empate' : own?.won === true ? 'Vitória' : own?.won === false ? 'Derrota' : 'Sem resultado')}</strong><span title={opponents}>{opponents}</span></header>
    <p><span title={game.map}>{game.map}</span>{seconds != null && <time>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time>}</p>
    <p><span>{game.queue}</span>{own?.ratingChange != null && <strong title={t(game.gameId === 'aoe4' && game.mode === 'ranked' ? 'Variação de pontos' : 'Variação de rating')}>{own.ratingChange > 0 ? '+' : ''}{own.ratingChange}</strong>}</p>
    {showSession && bar && <SessionBar session={sessionBarData(bar)} />}
  </section>;
}
