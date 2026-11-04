import type { MatchMode, MatchSnapshot } from '../../domain/match';

export function createAoe4Demo(mode: MatchMode = 'ranked'): MatchSnapshot {
  return {
    id: 'demo-aoe4', gameId: 'aoe4', source: 'demo', mode: mode === 'quick' ? 'quick' : 'ranked', map: 'Dry Arabia',
    queueId: mode === 'quick' ? 'qm_1v1' : 'rm_solo', queue: mode === 'quick' ? 'QM 1v1' : 'RM 1v1', selfPlayerId: 'demo-1',
    players: [
      { id: 'demo-1', name: 'Player One', civilization: 'English', civilizationId: 'english', uniqueUnits: [], symbol: '', rating: 1421, rank: 1430, rankLevel: 'conqueror_1', mmr: 1500, wins: 21, losses: 22, teamId: 1 },
      { id: 'demo-2', name: 'Player Two', civilization: 'Chinese', civilizationId: 'chinese', uniqueUnits: [], symbol: '', rating: 1193, rank: 4829, rankLevel: 'diamond_1', mmr: 1250, wins: 12, losses: 18, teamId: 2 },
    ],
  };
}
