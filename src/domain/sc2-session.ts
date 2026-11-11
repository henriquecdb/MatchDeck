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
