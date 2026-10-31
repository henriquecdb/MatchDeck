import type { MatchSnapshot, Player } from './match';

export interface RatingProjection {
  win: number;
  loss: number;
}

const supportedQueues = new Set(['rm_1v1', 'ew_1v1', 'dm_1v1', 'qp_rm_1v1', 'qp_ew_1v1', 'qp_dm_1v1']);

export function projectRating(match: MatchSnapshot, player: Player): RatingProjection | null {
  if (!match.queueId || !supportedQueues.has(match.queueId) || match.players.length !== 2) return null;
  const opponent = match.players.find(candidate => candidate.id !== player.id);
  const rating = player.rating;
  const opponentRating = opponent?.rating ?? null;
  if (!opponent || !validRating(rating) || !validRating(opponentRating)) return null;
  const expectedWin = 1 / (1 + 10 ** ((opponentRating - rating) / 400));
  return { win: Math.round(32 * (1 - expectedWin)), loss: -Math.round(32 * expectedWin) };
}

function validRating(rating: number | null): rating is number {
  return rating !== null && Number.isFinite(rating) && rating > 0;
}
