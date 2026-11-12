// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { createSc2PostGameDemo } from '../../games/sc2/demo';
import { usePostGame } from './use-post-game';

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

it('shows demo cards without a linked profile and expires them at the configured time', async () => {
  vi.useFakeTimers();
  const runtime = new BrowserRuntime();
  await runtime.selectGame('sc2');
  await runtime.start(createSc2PostGameDemo('draw'));
  const state = await runtime.read();
  const hook = renderHook(({ value }) => usePostGame(value), { initialProps: { value: state } });
  expect(hook.result.current?.game.players[0].draw).toBe(true);
  hook.rerender({ value: { ...state, detection: { ...state.detection, config: { ...state.detection.config, gameId: 'aoe4' } } } });
  expect(hook.result.current).toBeNull();
  hook.rerender({ value: state });
  act(() => { vi.advanceTimersByTime(8010); });
  expect(hook.result.current).toBeNull();
});
