export type MatchMode = 'ranked' | 'quick' | 'skirmish' | 'custom';

export const modeLabels: Record<MatchMode, string> = {
  ranked: 'Ranqueada',
  quick: 'Multiplayer rápido',
  skirmish: 'Skirmish',
  custom: 'Lobby personalizado',
};

export interface Player {
  id: string;
  name: string;
  civilization: string;
  uniqueUnits: string[];
  symbol: string;
  civilizationId?: string | null;
  color?: number | null;
  colorHex?: string | null;
  rating: number | null;
  wins: number | null;
  losses: number | null;
  ratingChange?: number | null;
  teamId?: number | null;
  won?: boolean | null;
}

export interface MatchSnapshot {
  id: string;
  gameId: string;
  mode: MatchMode;
  map: string;
  source: 'demo' | 'live';
  players: Player[];
  queue?: string | null;
  queueId?: string | null;
  warnings?: string[];
  syncedAt?: string | null;
  replayOf?: string | null;
  finishedAt?: string | null;
  selfPlayerId?: string | null;
}

export function replayMatch(match: MatchSnapshot): MatchSnapshot {
  return { ...structuredClone(match), id: `demo-${match.id}`, source: 'demo', replayOf: match.id };
}

export function winRate(player: Pick<Player, 'wins' | 'losses'>): string {
  if (player.wins === null || player.losses === null) return '—';
  const total = player.wins + player.losses;
  return total > 0 ? `${((player.wins / total) * 100).toFixed(1)}%` : '—';
}

export function captureMatch(current: MatchSnapshot | null, incoming: MatchSnapshot): MatchSnapshot {
  return current?.id === incoming.id ? current : structuredClone(incoming);
}
