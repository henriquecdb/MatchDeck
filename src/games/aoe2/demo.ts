import type { MatchMode, MatchSnapshot } from '../../domain/match';

export function createDemoMatch(mode: MatchMode): MatchSnapshot {
  const ranked = mode === 'ranked';
  return {
    id: crypto.randomUUID(),
    gameId: 'aoe2-de',
    mode,
    map: 'Arabia',
    source: 'demo',
    queueId: mode === 'ranked' ? 'rm_1v1' : mode === 'quick' ? 'qp_rm_1v1' : null,
    players: [
      { id: 'demo-1', name: 'Jogador 1', teamId: 1, civilization: 'Francos', civilizationId: 'franks', color: 1, colorHex: '#405BFF', uniqueUnits: ['Lançador de machados'], symbol: '⚔', rating: ranked ? 1250 : null, wins: ranked ? 120 : null, losses: ranked ? 100 : null },
      { id: 'demo-2', name: mode === 'skirmish' ? 'Computador' : 'Jogador 2', teamId: 2, civilization: 'Britânicos', civilizationId: 'britons', color: 2, colorHex: '#FF0000', uniqueUnits: ['Arqueiro de arco longo'], symbol: '➶', rating: ranked ? 1285 : null, wins: ranked ? 90 : null, losses: ranked ? 85 : null },
    ],
  };
}
