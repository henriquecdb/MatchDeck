import { sessionRecord } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';

export interface SessionBarData { matches: Array<{ id: string; opponent: string; won: boolean | null; draw: boolean }>; }

export function SessionBar({ session, label = 'Sessão' }: { session: SessionBarData; label?: string }) {
  const { t, language } = useI18n();
  const { wins, losses, draws, winRate } = sessionRecord(session);
  return <section className="sc2-session-bar" aria-label={t(label)}>
    <strong>{t('Sessão')}</strong>
    <span className="sc2-session-record">
      <b title={t('Vitórias')}>{wins}{t('V')}</b>
      <b title={t('Derrotas')}>{losses}{t('D')}</b>
      {draws > 0 && <b title={t('Empates')}>{draws}{t('E')}</b>}
    </span>
    <span className="sc2-session-rate" title={t('Aproveitamento')}>{winRate == null ? '—' : winRate.toLocaleString(language, { maximumFractionDigits: 0 }) + '%'}</span>
    <ol aria-label={t('Últimos resultados da sessão')}>{session.matches.slice(0, 10).reverse().map(match => {
      const result = match.draw ? 'Empate' : match.won === true ? 'Vitória' : match.won === false ? 'Derrota' : 'Sem resultado';
      return <li key={match.id} className={match.draw ? 'is-draw' : match.won === true ? 'is-win' : match.won === false ? 'is-loss' : 'is-unknown'}
        title={t(result) + ' · ' + match.opponent} aria-label={t(result)}>
        {t(match.draw ? 'E' : match.won === true ? 'V' : match.won === false ? 'D' : '—')}
      </li>;
    })}</ol>
  </section>;
}
