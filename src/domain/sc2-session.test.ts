import { expect, it } from 'vitest';
import { sessionRaceRecords, sessionRecord } from './sc2-session';
import { sc2DemoSession } from '../games/sc2/demo';

it('groups session results by opponent race and preserves draws and missing races', () => {
  const sample = sc2DemoSession.matches[0];
  const session = { ...sc2DemoSession, matches: [
    { ...sample, id: 't', opponentRace: 'terran', won: true, draw: false },
    { ...sample, id: 'z', opponentRace: 'ZERG', won: false, draw: false },
    { ...sample, id: 'tie', opponentRace: 'ZERG', won: null, draw: true },
    { ...sample, id: 'random', opponentRace: 'RANDOM', won: true, draw: false },
    { ...sample, id: 'unknown', opponentRace: '', won: null, draw: false },
  ] };
  const records = sessionRaceRecords(session);
  expect(records.find(record => record.race === 'TERRAN')).toMatchObject({ wins: 1, losses: 0, draws: 0, winRate: 100 });
  expect(records.find(record => record.race === 'ZERG')).toMatchObject({ wins: 0, losses: 1, draws: 1, winRate: 0 });
  expect(records.find(record => record.race === 'PROTOSS')?.winRate).toBeNull();
  expect(records.find(record => record.race === 'RANDOM')?.wins).toBe(1);
  expect(records.find(record => record.race === 'UNKNOWN')?.winRate).toBeNull();
  const total = sessionRecord(session);
  expect(records.reduce((sum, record) => sum + record.wins, 0)).toBe(total.wins);
  expect(records.reduce((sum, record) => sum + record.losses, 0)).toBe(total.losses);
  expect(records.reduce((sum, record) => sum + record.draws, 0)).toBe(total.draws);
});
