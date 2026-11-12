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

export function sessionRecord(session: Pick<Sc2Session, 'matches'> | null) {
  const matches = session?.matches ?? [];
  const wins = matches.filter(match => match.won === true && !match.draw).length;
  const losses = matches.filter(match => match.won === false && !match.draw).length;
  const draws = matches.filter(match => match.draw).length;
  const total = wins + losses + draws;
  return { wins, losses, draws, winRate: total ? wins / total * 100 : null };
}

export function sessionRaceRecords(session: Sc2Session) {
  const known = ['TERRAN', 'ZERG', 'PROTOSS', 'RANDOM'];
  const raceOf = (match: Sc2SessionMatch) => {
    const race = match.opponentRace.toUpperCase();
    return known.includes(race) ? race : 'UNKNOWN';
  };
  const races = [...new Set(['TERRAN', 'ZERG', 'PROTOSS', ...session.matches.map(raceOf)])];
  return races.map(race => {
    const matches = session.matches.filter(match => raceOf(match) === race);
    return { race, ...sessionRecord({ matches }) };
  });
}
