import type { MatchSnapshot, Player } from './match';

export interface MatchTeam {
  id: string;
  label: string;
  players: Player[];
}

export function matchTeams(match: MatchSnapshot): MatchTeam[] {
  if (match.players.every(player => player.teamId != null && player.teamId > 0)) {
    const groups = new Map<number, Player[]>();
    for (const player of match.players) {
      const id = player.teamId;
      if (id == null) continue;
      groups.set(id, [...(groups.get(id) ?? []), player]);
    }
    return [...groups].sort(([left], [right]) => left - right)
      .map(([id, players]) => ({ id: `team-${id}`, label: `Equipe ${id}`, players }));
  }
  if (match.players.length === 2 && match.queueId?.endsWith('_1v1')) {
    return match.players.map((player, index) => ({ id: player.id, label: `Jogador ${index + 1}`, players: [player] }));
  }
  return [{ id: 'players', label: 'Jogadores', players: match.players }];
}
