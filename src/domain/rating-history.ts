import type { RatingPoint } from './profile';

export function availableRatingPoints(points: RatingPoint[]): RatingPoint[] {
  const valid = points.filter(point => Number.isFinite(point.rating) && point.rating >= 0 && Number.isFinite(Date.parse(point.recordedAt)));
  return [...new Map(valid.map(point => [Date.parse(point.recordedAt), point])).values()]
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt)).slice(-30);
}

export function supportsRatingHistory(gameId: string, queueId: string): boolean {
  if (gameId === 'sc2') return /^sc2_1v1_(terran|protoss|zerg|random)$/.test(queueId);
  if (gameId === 'aoe4') return true;
  return gameId === 'aoe2-de' && ['rm_1v1', 'ew_1v1', 'dm_1v1', 'qp_rm_1v1', 'qp_ew_1v1', 'qp_dm_1v1'].includes(queueId);
}
