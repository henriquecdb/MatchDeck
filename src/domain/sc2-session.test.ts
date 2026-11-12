import { expect, it } from 'vitest';
import { opponentRecords, sessionMapRecords, sessionRaceRecords, sessionRecord } from './sc2-session';
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

it('keeps homonyms separate and follows the latest confirmed name for one identity', () => {
  const sample = sc2DemoSession.matches[0];
  const records = opponentRecords({ profileId: 42, matches: [
    { ...sample, id: 'a', opponentId: '1-S2-1-99', opponent: 'Same', won: true, finishedAt: '2026-11-10T10:00:00Z' },
    { ...sample, id: 'b', opponentId: '1-S2-2-99', opponent: 'Same', won: false, finishedAt: '2026-11-10T11:00:00Z' },
    { ...sample, id: 'c', opponentId: '1-S2-1-99', opponent: 'Renamed', won: false, finishedAt: '2026-11-10T12:00:00Z' },
    { ...sample, id: 'unknown', opponent: 'Same' },
  ] });
  expect(records).toHaveLength(2);
  expect(records[0]).toMatchObject({ id: '1-S2-1-99', name: 'Renamed', total: 2, wins: 1, losses: 1 });
  expect(records[1]).toMatchObject({ id: '1-S2-2-99', total: 1, losses: 1 });
});

it('shows map sample size and includes draws without merging map editions', () => {
  const sample = sc2DemoSession.matches[0];
  const rows = sessionMapRecords({ ...sc2DemoSession, matches: [
    { ...sample, id: 'a', map: 'Arena', won: true, draw: false },
    { ...sample, id: 'b', map: 'Arena', won: null, draw: true },
    { ...sample, id: 'c', map: 'Arena LE', won: false, draw: false },
  ] });
  expect(rows[0]).toMatchObject({ map: 'Arena', total: 2, wins: 1, draws: 1, winRate: 50 });
  expect(rows[1]).toMatchObject({ map: 'Arena LE', total: 1, losses: 1, winRate: 0 });
});
