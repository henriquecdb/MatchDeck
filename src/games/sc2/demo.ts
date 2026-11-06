import type { MatchSnapshot, MatchMode } from '../../domain/match';
export function createSc2Demo(_mode: MatchMode): MatchSnapshot {
  return { id: 'demo-sc2-' + Date.now(), gameId: 'sc2', mode: 'ranked', map: 'Mapa de demonstração', source: 'demo', queue: '1v1 · demonstração', queueId: 'sc2_1v1', selfPlayerId: 'sc2-demo-1',
    players: [
      { id: 'sc2-demo-1', name: 'Nova', civilization: 'TERRAN', civilizationId: 'TERRAN', uniqueUnits: [], symbol: '', rating: 4417, mmr: 4417, rank: 827, rankLevel: 'Master', wins: 21, losses: 12, draws: 0, teamId: 1 },
      { id: 'sc2-demo-2', name: 'Orion', civilization: 'ZERG', civilizationId: 'ZERG', uniqueUnits: [], symbol: '', rating: 4470, mmr: 4470, rank: 790, rankLevel: 'Master', wins: 18, losses: 10, draws: 1, teamId: 2 },
    ] };
}
