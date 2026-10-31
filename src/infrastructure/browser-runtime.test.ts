import { beforeEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from './browser-runtime';
import { createDemoMatch } from '../games/aoe2/demo';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
});

it('publishes start and finish while preserving the original snapshot', async () => {
  const runtime = new BrowserRuntime();
  const listener = vi.fn();
  const unsubscribe = await runtime.subscribe(listener);
  const match = createDemoMatch('ranked');
  await runtime.start(match);
  match.players[0].rating = 9000;
  await runtime.start(match);
  expect((await runtime.read()).match?.players[0].rating).toBe(1250);
  await runtime.finish();
  expect((await runtime.read()).match).toBeNull();
  expect(listener).toHaveBeenCalledTimes(3);
  unsubscribe();
  await runtime.start(createDemoMatch('skirmish'));
  expect(listener).toHaveBeenCalledTimes(3);
});

it('persists preferences without restoring an ended or previous match', async () => {
  const runtime = new BrowserRuntime();
  await runtime.configure({ x: -500, y: 120, opacity: 0.5, locked: true, layout: 'compact', autoUpdate: false });
  await runtime.start(createDemoMatch('quick'));
  const restored = await new BrowserRuntime().read();
  expect(restored.settings).toEqual({ x: -500, y: 120, opacity: 0.5, locked: true, layout: 'compact', autoUpdate: false });
  expect(restored.match).toBeNull();
});

it('recovers from corrupted persisted preferences', async () => {
  localStorage.setItem('matchdeck.settings', '{invalid');
  expect((await new BrowserRuntime().read()).settings.opacity).toBe(0.9);
});
