import type { MatchSnapshot } from '../../domain/match';
import type { Sc2Session } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';
import { sc2DemoSession } from './demo';
import { Sc2SessionBar } from './Sc2SessionBar';

export function Sc2PostGameCard({ game, session }: { game: MatchSnapshot; session: Sc2Session | null }) {
  const { t } = useI18n();
  const own = game.players.find(player => player.id === game.selfPlayerId);
  const opponent = game.players.find(player => player.id !== game.selfPlayerId);
  const seconds = game.durationSeconds;
  const currentSession = game.source === 'demo' && session ? { ...sc2DemoSession, matches: [{ id: game.id, finishedAt: game.finishedAt ?? new Date().toISOString(), map: game.map, race: own?.civilization ?? 'TERRAN', opponent: opponent?.name ?? '', opponentRace: opponent?.civilization ?? 'ZERG', won: own?.won ?? null, draw: own?.draw === true }, ...sc2DemoSession.matches] } : session;
  return <section className={'sc2-post-game ' + (own?.draw ? 'is-draw' : own?.won ? 'is-win' : 'is-loss')} aria-label={t('Resumo pós-partida')}>
    {game.source === 'demo' && <small>{t('DEMONSTRAÇÃO')}</small>}
    <header><strong>{t(own?.draw ? 'Empate' : own?.won === true ? 'Vitória' : own?.won === false ? 'Derrota' : 'Sem resultado')}</strong><span title={opponent?.name}>{opponent?.name}</span></header>
    <p><span title={game.map}>{game.map}</span>{seconds != null && <time>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time>}</p>
    {currentSession && !currentSession.endedAt && <Sc2SessionBar session={currentSession} />}
  </section>;
}
