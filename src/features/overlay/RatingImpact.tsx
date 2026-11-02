import type { MatchSnapshot, Player } from '../../domain/match';
import { projectRating } from '../../domain/rating';

export function RatingImpact({ match, player, condensed = false }: { match: MatchSnapshot; player: Player; condensed?: boolean }) {
  const className = `rating-impact${condensed ? ' rating-impact-inline' : ''}`;
  if (match.finishedAt) {
    const delta = player.ratingChange;
    return <div className={className} title="Variação real informada pela API para esta partida">
      <span>Resultado</span><strong className={delta != null && delta < 0 ? 'losses' : 'wins'}>{delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`}</strong><span className="impact-kind">confirmado</span>
    </div>;
  }
  const projection = projectRating(match, player);
  return projection ? <div className={className} title="Projeção orientativa do modelo Elo com K=32. Não é uma previsão oficial; partidas rápidas e contas em calibração podem ter variações diferentes.">
    <span>Vitória</span><strong className="wins">~+{projection.win}</strong><span>Derrota</span><strong className="losses">~{projection.loss === 0 ? '−0' : projection.loss}</strong><span className="impact-kind">est.</span>
  </div> : <div className={`${className} impact-unavailable`} title="A estimativa exige uma fila 1v1 reconhecida e os ratings dos dois jogadores.">{condensed ? '—' : 'Variação de rating: —'}</div>;
}
