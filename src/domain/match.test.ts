import { describe, expect, it } from 'vitest';
import { captureMatch, replayMatch, winRate } from './match';
import { createDemoMatch } from '../games/aoe2/demo';

describe('match snapshot', () => {
  it('replays synchronized data without changing the original match or its mode', () => {
    const original = { ...createDemoMatch('quick'), source: 'live' as const, syncedAt: '2026-10-31T02:00:00Z' };
    const replay = replayMatch(original);
    expect(replay.source).toBe('demo');
    expect(replay.replayOf).toBe(original.id);
    expect(replay.syncedAt).toBe(original.syncedAt);
    expect(replay.players).toEqual(original.players);
    expect(replay.mode).toBe('quick');
    replay.players[0].rating = 9999;
    expect(original.players[0].rating).toBeNull();
    expect(original.source).toBe('live');
  });
  it('keeps the first snapshot for duplicate match events', () => {
    const incoming = createDemoMatch('ranked');
    const current = captureMatch(null, incoming);
    incoming.players[0].rating = 9999;
    expect(current.players[0].rating).toBe(1250);
    expect(captureMatch(current, incoming)).toBe(current);
    expect(captureMatch(current, createDemoMatch('quick')).mode).toBe('quick');
  });

  it('does not invent statistics for unranked players', () => {
    expect(winRate({ wins: null, losses: null })).toBe('—');
    expect(winRate({ wins: 0, losses: 0 })).toBe('—');
    expect(winRate({ wins: 3, losses: 1 })).toBe('75.0%');
  });
});
