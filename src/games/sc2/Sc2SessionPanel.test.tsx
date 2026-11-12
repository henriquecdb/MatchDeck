// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import type { Sc2Session } from '../../domain/sc2-session';
import { Sc2SessionPanel } from './Sc2SessionPanel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const session: Sc2Session = {
  profileId: 42,
  startedAt: '2026-11-10T20:00:00Z',
  endedAt: null,
  matches: [
    { id: 'draw', finishedAt: '2026-11-11T01:00:00Z', map: 'Arena', race: 'TERRAN', opponent: 'Orion', opponentRace: 'ZERG', won: null, draw: true },
    { id: 'win', finishedAt: '2026-11-10T23:00:00Z', map: 'Arena', race: 'TERRAN', opponent: 'Orion', opponentRace: 'ZERG', won: true, draw: false },
  ],
};

it('starts explicitly, receives only the linked profile results and ends without losing the record', async () => {
  const runtime = new BrowserRuntime();
  const command = vi.spyOn(runtime, 'sc2Session').mockResolvedValue(null);
  let update: (next: Sc2Session) => void = () => {};
  const unsubscribe = vi.fn();
  vi.spyOn(runtime, 'subscribeSc2Session').mockImplementation(async listener => {
    update = listener;
    return unsubscribe;
  });
  const view = render(<Sc2SessionPanel runtime={runtime} profileId={42} active={false} matchActive={false} />);
  expect(command).not.toHaveBeenCalled();
  view.rerender(<Sc2SessionPanel runtime={runtime} profileId={42} active matchActive={false} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sessão' })).toHaveProperty('disabled', false));
  command.mockResolvedValueOnce({ ...session, matches: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  await screen.findByRole('button', { name: 'Encerrar sessão' });
  expect(command).toHaveBeenLastCalledWith(42, 'start');
  act(() => update({ ...session, profileId: 99 }));
  expect(screen.queryByText('Orion')).toBeNull();
  act(() => update(session));
  const panel = screen.getByRole('region', { name: 'Sessão de StarCraft II' });
  expect(within(panel).getByText('50%', { selector: 'dd' })).toBeTruthy();
  expect(within(panel).getByText('Empate')).toBeTruthy();
  expect(within(panel).getByText('Vitória')).toBeTruthy();
  const matchups = screen.getByRole('region', { name: 'Por raça adversária' });
  expect(within(matchups).getAllByRole('listitem')).toHaveLength(3);
  expect(within(matchups).getByText('1V · 0D · 1E')).toBeTruthy();
  expect(within(matchups).getByText('50%')).toBeTruthy();
  view.rerender(<Sc2SessionPanel runtime={runtime} profileId={42} active matchActive />);
  expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toHaveProperty('disabled', true);
  view.rerender(<Sc2SessionPanel runtime={runtime} profileId={42} active matchActive={false} />);
  command.mockResolvedValueOnce({ ...session, endedAt: '2026-11-11T02:00:00Z' });
  fireEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
  await screen.findByRole('button', { name: 'Nova sessão' });
  expect(command).toHaveBeenLastCalledWith(42, 'finish');
  expect(within(screen.getByRole('list', { name: 'Últimos resultados' })).getAllByRole('listitem')).toHaveLength(2);
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('keeps a live replay update when the initial read finishes with an older record', async () => {
  const runtime = new BrowserRuntime();
  let resolveRead: (next: Sc2Session | null) => void = () => {};
  vi.spyOn(runtime, 'sc2Session').mockImplementation(() => new Promise(resolve => { resolveRead = resolve; }));
  let update: (next: Sc2Session) => void = () => {};
  vi.spyOn(runtime, 'subscribeSc2Session').mockImplementation(async listener => { update = listener; return () => {}; });
  render(<Sc2SessionPanel runtime={runtime} profileId={42} active matchActive={false} />);
  await waitFor(() => expect(runtime.sc2Session).toHaveBeenCalled());
  await act(async () => {
    update(session);
    resolveRead(null);
  });
  expect(screen.getByText('50%', { selector: 'dd' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toBeTruthy();
});
