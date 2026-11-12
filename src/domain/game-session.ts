import type { MatchSnapshot } from './match';
export interface GameSessionMatch {
  gameId: string; profileId: number; id: string; startedAt: string; finishedAt: string | null; observedAt: string;
  map: string; queueId: string | null; civilization: string; opponents: string[];
  won: boolean | null; draw: boolean; ratingChange: number | null; durationSeconds: number | null;
}
export interface GameSession { gameId: string; profileId: number; startedAt: string; endedAt: string | null; matches: GameSessionMatch[]; }
export type GameSessionAction = 'read' | 'start' | 'finish';
export function sessionBarData(session: GameSession) { return { matches: session.matches.map(match => ({ ...match, opponent: match.opponents.join(' × ') })) }; }
export function demoGameSession(gameId: string): GameSession {
  return { gameId, profileId: 0, startedAt: new Date().toISOString(), endedAt: null, matches: [true, false, true, true, false].map((won, index) => ({ gameId, profileId: 0, id: 'demo-session-' + index, startedAt: new Date(Date.now() - index * 1800000).toISOString(), finishedAt: null, observedAt: new Date().toISOString(), map: 'Arabia', queueId: null, civilization: '', opponents: ['Orion'], won, draw: false, ratingChange: null, durationSeconds: null })) };
}
export function sessionForMatch(session: GameSession | null, game: MatchSnapshot) {
  if (game.source === 'demo') return demoGameSession(game.gameId);
  return session?.endedAt == null && session?.gameId === game.gameId && String(session?.profileId) === game.selfPlayerId ? session : null;
}
