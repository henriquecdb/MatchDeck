import { beforeEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from './browser-runtime';
import { createDemoMatch } from '../games/aoe2/demo';
import { defaultSettings } from '../domain/settings';

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
  await runtime.configure({ ...defaultSettings, x: -500, y: 120, opacity: 0.5, locked: true, layout: 'compact' });
  await runtime.start(createDemoMatch('quick'));
  const restored = await new BrowserRuntime().read();
  expect(restored.settings).toEqual({ ...defaultSettings, x: -500, y: 120, opacity: 0.5, locked: true, layout: 'compact' });
  expect(restored.match).toBeNull();
});

it('hides only the current match without stopping it or changing detection', async () => {
  const runtime = new BrowserRuntime();
  const match = createDemoMatch('ranked');
  await runtime.start(match);
  await runtime.toggleVisibility();
  expect(await runtime.read()).toMatchObject({ match: { id: match.id }, hiddenMatchId: match.id, detection: { config: { enabled: false } } });
  await runtime.start(createDemoMatch('quick'));
  const next = await runtime.read();
  expect(next.hiddenMatchId).not.toBe(next.match?.id);
  await runtime.toggleVisibility();
  expect((await runtime.read()).hiddenMatchId).toBe(next.match?.id);
  await runtime.toggleVisibility();
  expect((await runtime.read()).hiddenMatchId).toBeNull();
});

it('recovers from corrupted persisted preferences', async () => {
  localStorage.setItem('matchdeck.settings', '{invalid');
  expect((await new BrowserRuntime().read()).settings.opacity).toBe(0.9);
});

it('migrates legacy game settings and keeps application preferences separate', async () => {
  localStorage.setItem('matchdeck.settings', JSON.stringify({ ...defaultSettings, autoUpdate: true, x: -600 }));
  const runtime = new BrowserRuntime();
  const initial = await runtime.read();
  expect(initial.preferences.autoUpdate).toBe(true);
  await runtime.configureApp({ ...initial.preferences, onboardingComplete: true, closeAction: 'exit' });
  await runtime.configure({ ...initial.settings, x: 300 });
  const restored = await new BrowserRuntime().read();
  expect(restored.settings.x).toBe(300);
  expect(restored.preferences).toMatchObject({ autoUpdate: true, onboardingComplete: true, closeAction: 'exit' });
  localStorage.setItem('matchdeck.preferences', '{bad json');
  expect((await new BrowserRuntime().read()).settings.x).toBe(300);
});
