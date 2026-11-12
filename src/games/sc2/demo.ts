import type { MatchSnapshot, MatchMode } from '../../domain/match';
import type { Sc2Session } from '../../domain/sc2-session';

export const sc2DemoSession: Sc2Session = {
  profileId: 0,
  startedAt: '2026-11-11T12:00:00Z',
  endedAt: null,
  matches: [true, false, true, true, false].map((won, index) => ({
    id: 'demo-result-' + index,
    finishedAt: new Date(Date.UTC(2026, 10, 11, 14, 0) - index * 15 * 60 * 1000).toISOString(),
    map: 'Arena', race: 'TERRAN', opponent: 'Orion', opponentRace: 'ZERG', won, draw: false,
  })),
};
export function createSc2Demo(_mode: MatchMode): MatchSnapshot {
  return { id: 'demo-sc2-' + Date.now(), gameId: 'sc2', mode: 'ranked', map: 'Mapa de demonstração', source: 'demo', queue: '1v1 · demonstração', queueId: 'sc2_1v1', selfPlayerId: 'sc2-demo-1',
    players: [
      { id: 'sc2-demo-1', name: 'Nova', civilization: 'TERRAN', civilizationId: 'TERRAN', uniqueUnits: [], symbol: '', rating: 4417, mmr: 4417, rank: 827, rankLevel: 'Master', wins: 21, losses: 12, draws: 0, teamId: 1 },
      { id: 'sc2-demo-2', name: 'Orion', civilization: 'ZERG', civilizationId: 'ZERG', uniqueUnits: [], symbol: '', rating: 4470, mmr: 4470, rank: 790, rankLevel: 'Master', wins: 18, losses: 10, draws: 1, teamId: 2 },
    ] };
}

export function createSc2PostGameDemo(result: 'win' | 'loss' | 'draw'): MatchSnapshot {
  const game = createSc2Demo('ranked');
  game.id = 'demo-sc2-result-' + Date.now();
  game.map = 'Arena LE';
  game.durationSeconds = 385;
  game.finishedAt = new Date().toISOString();
  game.players = game.players.map((player, index) => ({ ...player, won: result === 'draw' ? null : index === 0 ? result === 'win' : result === 'loss', draw: result === 'draw' }));
  return game;
}
