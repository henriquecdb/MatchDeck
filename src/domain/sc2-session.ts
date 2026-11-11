export interface Sc2SessionMatch {
  id: string;
  finishedAt: string;
  map: string;
  race: string;
  opponent: string;
  opponentRace: string;
  won: boolean | null;
  draw: boolean;
}

export interface Sc2Session {
  profileId: number;
  startedAt: string;
  endedAt: string | null;
  matches: Sc2SessionMatch[];
}

export type Sc2SessionAction = 'read' | 'start' | 'finish';

export function sessionRecord(session: Sc2Session | null) {
  const matches = session?.matches ?? [];
  const wins = matches.filter(match => match.won === true && !match.draw).length;
  const losses = matches.filter(match => match.won === false && !match.draw).length;
  const draws = matches.filter(match => match.draw).length;
  const total = wins + losses + draws;
  return { wins, losses, draws, winRate: total ? wins / total * 100 : null };
}
