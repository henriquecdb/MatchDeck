import type { MatchSnapshot } from '../../domain/match';
import { opponentRecords, type Sc2History, type Sc2Session } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';
import { Sc2SessionBar } from './Sc2SessionBar';

export function Sc2PostGameCard({ game, opponentId, session, history }: { game: MatchSnapshot; opponentId?: string; session: Sc2Session | null; history: Sc2History | null }) {
  const { t } = useI18n();
  const own = game.players.find(player => player.id === game.selfPlayerId);
  const opponent = game.players.find(player => player.id !== game.selfPlayerId);
  const record = history && opponentRecords(history).find(record => record.id === opponentId);
  const seconds = game.durationSeconds;
  return <section className={'sc2-post-game ' + (own?.draw ? 'is-draw' : own?.won ? 'is-win' : 'is-loss')} aria-label={t('Resumo pós-partida')}>
    <header><strong>{t(own?.draw ? 'Empate' : own?.won === true ? 'Vitória' : own?.won === false ? 'Derrota' : 'Sem resultado')}</strong><span title={opponent?.name}>{opponent?.name}</span></header>
    <p><span title={game.map}>{game.map}</span>{seconds != null && <time>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time>}</p>
    <p>{t('Confrontos')}: {record ? <span>{record.wins}{t('V')} · {record.losses}{t('D')}{record.draws > 0 && <> · {record.draws}{t('E')}</>}</span> : '—'}</p>
    {session && !session.endedAt && <Sc2SessionBar session={session} />}
  </section>;
}
