export interface Sc2SessionMatch {
  id: string;
  finishedAt: string;
  map: string;
  race: string;
  opponent: string;
  opponentRace: string;
  opponentId?: string | null;
  durationSeconds?: number | null;
  won: boolean | null;
  draw: boolean;
}

export interface Sc2Session {
  profileId: number;
  startedAt: string;
  endedAt: string | null;
  matches: Sc2SessionMatch[];
  mmrStatus?: 'loading' | 'error' | 'stale' | 'unavailable' | 'ready' | null;
  mmr?: Array<{ race: string; season: number; initial: number | null; latest: number; queriedAt: string }>;
}

export type Sc2SessionAction = 'read' | 'start' | 'finish' | 'refresh';

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

export interface Sc2History { profileId: number; matches: Sc2SessionMatch[]; }

export function sessionMapRecords(session: Sc2Session) {
  return [...new Set(session.matches.map(match => match.map))].map(map => {
    const matches = session.matches.filter(match => match.map === map);
    return { map, total: matches.length, ...sessionRecord({ matches }) };
  }).sort((a, b) => b.total - a.total || a.map.localeCompare(b.map));
}

export function opponentRecords(history: Sc2History) {
  const groups = new Map<string, Sc2SessionMatch[]>();
  for (const match of history.matches) {
    if (!match.opponentId) continue;
    const matches = groups.get(match.opponentId) ?? [];
    matches.push(match);
    groups.set(match.opponentId, matches);
  }
  return [...groups].map(([id, matches]) => {
    const latest = [...matches].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
    return { id, name: latest.opponent, lastPlayed: latest.finishedAt, total: matches.length, ...sessionRecord({ matches }) };
  }).sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed));
}
