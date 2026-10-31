import type { MatchSnapshot, Player } from '../../domain/match';
import { projectRating } from '../../domain/rating';

export function RatingImpact({ match, player }: { match: MatchSnapshot; player: Player }) {
  if (match.finishedAt) {
    const delta = player.ratingChange;
    return <div className="rating-impact" title="Variação real informada pela API para esta partida">
      <span>Resultado</span><strong className={delta != null && delta < 0 ? 'losses' : 'wins'}>{delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`}</strong><span className="impact-kind">confirmado</span>
    </div>;
  }
  const projection = projectRating(match, player);
  return projection ? <div className="rating-impact" title="Projeção orientativa do modelo Elo com K=32. Não é uma previsão oficial; partidas rápidas e contas em calibração podem ter variações diferentes.">
    <span>Vitória</span><strong className="wins">~+{projection.win}</strong><span>Derrota</span><strong className="losses">~{projection.loss === 0 ? '−0' : projection.loss}</strong><span className="impact-kind">est.</span>
  </div> : <div className="rating-impact impact-unavailable" title="A estimativa exige uma fila 1v1 reconhecida e os ratings dos dois jogadores.">Variação de rating: —</div>;
}
