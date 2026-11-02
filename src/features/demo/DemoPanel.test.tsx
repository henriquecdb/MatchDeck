// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { createDemoMatch } from '../../games/aoe2/demo';
import { DemoPanel } from './DemoPanel';

afterEach(() => { cleanup(); localStorage.clear(); });

it('can use fictional players even when a synchronized match is available', async () => {
  const runtime = new BrowserRuntime();
  const state = await runtime.read();
  state.lastSynced = { ...createDemoMatch('quick'), id: 'saved', source: 'live', map: 'Arena' };
  const start = vi.spyOn(runtime, 'start');
  render(<DemoPanel runtime={runtime} state={state} desktop={false} perform={action => action()} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Dados da demonstração' }), { target: { value: 'fictional' } });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar demonstração' }));
  await waitFor(() => expect(start).toHaveBeenCalledOnce());
  expect(start.mock.calls[0][0]).toMatchObject({ source: 'demo', map: 'Arabia' });
  expect(start.mock.calls[0][0].replayOf).toBeUndefined();
  expect(state.lastSynced.map).toBe('Arena');
});

it('replays the selected cached match without a network synchronization', async () => {
  const runtime = new BrowserRuntime();
  const state = await runtime.read();
  state.lastSynced = { ...createDemoMatch('quick'), id: 'saved', source: 'live', map: 'Arena' };
  vi.spyOn(runtime, 'read').mockResolvedValue(state);
  const sync = vi.spyOn(runtime, 'syncLatest');
  const start = vi.spyOn(runtime, 'start');
  render(<DemoPanel runtime={runtime} state={state} desktop={false} perform={action => action()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar demonstração' }));
  await waitFor(() => expect(start).toHaveBeenCalledOnce());
  expect(start.mock.calls[0][0]).toMatchObject({ source: 'demo', map: 'Arena', replayOf: 'saved' });
  expect(sync).not.toHaveBeenCalled();
});
