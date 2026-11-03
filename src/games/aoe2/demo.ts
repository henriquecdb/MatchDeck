import type { MatchMode, MatchSnapshot } from '../../domain/match';

export type DemoTeamSize = 1 | 2 | 3 | 4;

export function createDemoMatch(mode: MatchMode, teamSize: DemoTeamSize = 1): MatchSnapshot {
  const ranked = mode === 'ranked';
  return {
    id: crypto.randomUUID(),
    gameId: 'aoe2-de',
    mode,
    map: 'Arabia',
    source: 'demo',
    selfPlayerId: 'demo-1',
    queueId: mode === 'ranked' ? teamSize === 1 ? 'rm_1v1' : 'rm_team' : mode === 'quick' ? teamSize === 1 ? 'qp_rm_1v1' : 'qp_rm_team' : null,
    players: teamSize === 1 ? [
      { id: 'demo-1', name: 'Jogador 1', teamId: 1, civilization: 'Francos', civilizationId: 'franks', color: 1, colorHex: '#405BFF', uniqueUnits: ['Lançador de machados'], symbol: '⚔', rating: ranked ? 1250 : null, wins: ranked ? 120 : null, losses: ranked ? 100 : null },
      { id: 'demo-2', name: mode === 'skirmish' ? 'Computador' : 'Jogador 2', teamId: 2, civilization: 'Britânicos', civilizationId: 'britons', color: 2, colorHex: '#FF0000', uniqueUnits: ['Arqueiro de arco longo'], symbol: '➶', rating: ranked ? 1285 : null, wins: ranked ? 90 : null, losses: ranked ? 85 : null },
    ] : createTeamPlayers(teamSize, ranked),
  };
}

function createTeamPlayers(teamSize: DemoTeamSize, ranked: boolean): MatchSnapshot['players'] {
  const civilizations = [
    ['franks', 'Franks', 'Throwing Axeman'], ['britons', 'Britons', 'Longbowman'],
    ['mongols', 'Mongols', 'Mangudai'], ['byzantines', 'Byzantines', 'Cataphract'],
    ['japanese', 'Japanese', 'Samurai'], ['vikings', 'Vikings', 'Berserk'],
    ['persians', 'Persians', 'War Elephant'], ['spanish', 'Spanish', 'Conquistador'],
  ];
  return Array.from({ length: teamSize * 2 }, (_, index) => {
    const [civilizationId, civilization, unit] = civilizations[index];
    return { id: `demo-${index + 1}`, name: `Player ${index + 1}`, teamId: index < teamSize ? 1 : 2, civilization, civilizationId, uniqueUnits: [unit], symbol: '', color: index + 1, rating: ranked ? 1250 + index * 35 : null, wins: ranked ? 120 + index * 10 : null, losses: ranked ? 100 + index * 5 : null };
  });
}
