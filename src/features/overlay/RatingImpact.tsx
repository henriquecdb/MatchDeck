import { useI18n } from '../../i18n/LanguageProvider';
import type { MatchSnapshot, Player } from '../../domain/match';
import { projectRating } from '../../domain/rating';

export function RatingImpact({ match, player, condensed = false, showProjection = true }: { match: MatchSnapshot; player: Player; condensed?: boolean; showProjection?: boolean }) {
  const { t } = useI18n();
  const className = `rating-impact${condensed ? ' rating-impact-inline' : ''}`;
  if (match.finishedAt) {
    const delta = player.ratingChange;
    return <div className={className} title={t('Variação real informada pela API para esta partida')}>
      <span>{t('Resultado')}</span><strong className={delta != null && delta < 0 ? 'losses' : 'wins'}>{delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`}</strong><span className="impact-kind">{t('confirmado')}</span>
    </div>;
  }
  if (!showProjection) return null;
  const projection = projectRating(match, player);
  return projection ? <div className={className} title={t('Projeção orientativa do modelo Elo com K=32. Não é uma previsão oficial; partidas rápidas e contas em calibração podem ter variações diferentes.')}>
    <span>{t('Vitória')}</span><strong className="wins">~+{projection.win}</strong><span>{t('Derrota')}</span><strong className="losses">~{projection.loss === 0 ? '−0' : projection.loss}</strong><span className="impact-kind">{t('est.')}</span>
  </div> : <div className={`${className} impact-unavailable`} title={t('A estimativa exige uma fila 1v1 reconhecida e os ratings dos dois jogadores.')}>{condensed ? '—' : t('Variação de rating: —')}</div>;
}
