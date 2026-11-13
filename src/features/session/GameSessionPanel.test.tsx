// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import type { GameSession } from '../../domain/game-session';
import { demoGameSession } from '../../domain/game-session';
import { GameSessionPanel } from './GameSessionPanel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

it('starts, receives only this game/profile results, and ends without resetting the score', async () => {
  const runtime = new BrowserRuntime();
  const session: GameSession = { ...demoGameSession('aoe2-de'), profileId: 42, matches: [] };
  const command = vi.spyOn(runtime, 'gameSession').mockResolvedValue(null);
  let update: (value: GameSession) => void = () => {};
  vi.spyOn(runtime, 'subscribeGameSession').mockImplementation(async listener => { update = listener; return () => {}; });
  render(<GameSessionPanel runtime={runtime} gameId="aoe2-de" profileId={42} active matchActive={false} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sessão' })).toHaveProperty('disabled', false));
  command.mockResolvedValueOnce(session);
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  await screen.findByRole('button', { name: 'Encerrar sessão' });
  expect(command).toHaveBeenLastCalledWith('aoe2-de', 42, 'start');
  const results = { ...session, matches: demoGameSession('aoe2-de').matches.slice(0, 2) };
  act(() => update({ ...results, gameId: 'aoe4' }));
  expect(screen.queryByRole('list')).toBeNull();
  act(() => update({ ...results, profileId: 99 }));
  expect(screen.queryByRole('list')).toBeNull();
  act(() => update(results));
  expect(screen.getByText('50%', { selector: 'dd' })).toBeTruthy();
  command.mockResolvedValueOnce({ ...results, endedAt: new Date().toISOString() });
  fireEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
  await screen.findByRole('button', { name: 'Nova sessão' });
  expect(within(screen.getByRole('list', { name: 'Últimos resultados' })).getAllByRole('listitem')).toHaveLength(2);
});

it('preserves newer published results when an older initial read finishes later', async () => {
  const runtime = new BrowserRuntime();
  let resolve: (value: GameSession | null) => void = () => {};
  let update: (value: GameSession) => void = () => {};
  vi.spyOn(runtime, 'gameSession').mockImplementation(() => new Promise(done => { resolve = done; }));
  vi.spyOn(runtime, 'subscribeGameSession').mockImplementation(async listener => { update = listener; return () => {}; });
  render(<GameSessionPanel runtime={runtime} gameId="aoe4" profileId={42} active matchActive />);
  await waitFor(() => expect(runtime.gameSession).toHaveBeenCalled());
  act(() => update({ ...demoGameSession('aoe4'), profileId: 42 }));
  await act(async () => resolve(null));
  expect(screen.getByText('60%', { selector: 'dd' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toHaveProperty('disabled', true);
});
