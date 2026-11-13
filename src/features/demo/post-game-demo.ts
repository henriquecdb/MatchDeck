import { gameIntegration } from '../../games/registry';
import { createSc2PostGameDemo } from '../../games/sc2/demo';
import type { MatchMode } from '../../domain/match';
import type { DemoTeamSize } from '../../games/aoe2/demo';
export function createPostGameDemo(gameId: string, result: 'win' | 'loss' | 'draw', mode: MatchMode, teamSize: DemoTeamSize) {
  if (gameId === 'sc2') return createSc2PostGameDemo(result);
  const game = gameIntegration(gameId)!.demo(mode, teamSize);
  const own = game.players.find(p => p.id === game.selfPlayerId) ?? game.players[0];
  return { ...game, id: 'demo-' + gameId + '-result-' + Date.now(), finishedAt: new Date().toISOString(), durationSeconds: 1805, players: game.players.map(player => {
    const ally = player.id === own.id || (own.teamId != null && player.teamId === own.teamId);
    return { ...player, won: result === 'draw' ? null : ally ? result === 'win' : result === 'loss', draw: result === 'draw', ratingChange: result === 'draw' ? 0 : ally === (result === 'win') ? 15 : -15 };
  }) };
}
