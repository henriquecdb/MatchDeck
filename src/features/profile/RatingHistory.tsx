import { availableRatingPoints } from '../../domain/rating-history';
import { useState } from 'react';
import type { ProfileLeaderboard } from '../../domain/profile';
import { useI18n } from '../../i18n/LanguageProvider';

export function RatingHistory({ board, label }: { board: ProfileLeaderboard; label: string }) {
  const { t, language } = useI18n();
  const points = availableRatingPoints(board.ratingHistory ?? []);
  const [active, setActive] = useState<number | null>(null);
  const formatDate = (date: string) => new Date(date).toLocaleDateString(language);
  const selected = (active === null ? undefined : points[active]) ?? points.at(-1);
  const change = points.length > 1 ? points.at(-1)!.rating - points[0].rating : null;
  const values = points.map(point => point.rating);
  const min = Math.max(0, Math.floor(((points.length ? Math.min(...values) : 0) - 50) / 50) * 50);
  const max = Math.ceil((Math.max(...values, 0) + 50) / 50) * 50;
  return <section className="rating-history" aria-label={t('Evolução de rating')}>
    <div className="rating-history-heading"><div><h3>{t('Evolução de rating')}</h3><small>{label}{board.season != null ? ' · ' + t('Temporada {0}', { 0: board.season }) : ''}</small></div>
      {change != null && <span className={change >= 0 ? 'rating-trend is-positive' : 'rating-trend is-negative'} title={t('Variação entre o primeiro e o último registro')}>{change > 0 ? '+' : ''}{change}</span>}
    </div>
    {!points.length ? <p>{t('Sem histórico de rating publicado para esta modalidade.')}</p> : <>
      <div className="rating-history-value" aria-live="polite"><strong>{selected!.rating.toLocaleString(language)}</strong><small>{new Date(selected!.recordedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <div className="rating-history-plot"><div className="rating-history-scale"><span>{max.toLocaleString(language)}</span><span>{min.toLocaleString(language)}</span></div>
      <div className="rating-bars" role="group" aria-label={t('Registros de rating')} onMouseLeave={() => setActive(null)}>
        {points.map((point, index) => <button key={point.recordedAt} type="button" className={index === (active ?? points.length - 1) ? 'is-active' : ''}
          style={{ '--bar-height': ((point.rating - min) / (max - min) * 100) + '%' } as React.CSSProperties}
          onFocus={() => setActive(index)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(index)} onClick={() => setActive(index)}
          aria-label={t('{0}: {1}', { 0: new Date(point.recordedAt).toLocaleString(language), 1: point.rating })}>
          <span aria-hidden="true" />
        </button>)}
      </div>
      </div>
      <div className="rating-history-period"><time dateTime={points[0].recordedAt}>{formatDate(points[0].recordedAt)}</time><time dateTime={points.at(-1)!.recordedAt}>{formatDate(points.at(-1)!.recordedAt)}</time></div>
      <p className="rating-history-note">{t('Até 30 registros publicados, em ordem cronológica. Não representa todo o histórico da conta.')}</p>
    </>}
  </section>;
}
