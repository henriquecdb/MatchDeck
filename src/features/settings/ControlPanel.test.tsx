// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import type { AppState } from '../../application/runtime';
import { ControlPanel } from './ControlPanel';
import { createDemoMatch } from '../../games/aoe2/demo';
import { defaultSettings } from '../../domain/settings';
import { within } from '@testing-library/react';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('shows loading until initialization completes and offers retry after failure', async () => {
  const runtime = new BrowserRuntime();
  const initial = await runtime.read();
  let resolve!: (state: AppState) => void;
  const pending = new Promise<AppState>(done => { resolve = done; });
  vi.spyOn(runtime, 'read').mockImplementationOnce(() => pending)
    .mockRejectedValueOnce(new Error('conexão indisponível')).mockResolvedValue(initial);
  const view = render(<ControlPanel runtime={runtime} desktop={false} />);
  expect(screen.getByRole('progressbar', { name: 'Carregando aplicativo' })).toBeTruthy();
  expect(screen.queryByRole('tab')).toBeNull();
  await act(async () => resolve(initial));
  await screen.findByRole('tab', { name: 'Partida' });
  view.unmount();
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByRole('tab', { name: 'Partida' });
});

it.each(['detailed', 'compact'] as const)('updates projection visibility during an active %s demonstration', async layout => {
  const runtime = new BrowserRuntime();
  await runtime.configure({ ...defaultSettings, layout });
  const match = createDemoMatch('ranked');
  await runtime.start(match);
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('tab', { name: 'Overlay' });
  fireEvent.click(screen.getByRole('tab', { name: 'Overlay' }));
  const region = screen.getByRole('region', { name: layout === 'compact' ? 'Dados da partida em modo compacto' : 'Dados da partida' });
  expect(within(region).getAllByText(/~\+/)).toHaveLength(2);
  const checkbox = screen.getByRole('checkbox', { name: 'Exibir projeção não oficial de ganho/perda de rating' });
  fireEvent.click(checkbox);
  await waitFor(() => expect(within(region).queryByText(/~\+/)).toBeNull());
  expect((await runtime.read()).settings.showProjection).toBe(false);
  expect((await runtime.read()).match?.id).toBe(match.id);
  fireEvent.click(checkbox);
  await waitFor(() => expect(within(region).getAllByText(/~\+/)).toHaveLength(2));
});

it('separates features and preserves an active demonstration and preferences across tabs', async () => {
  render(<ControlPanel runtime={new BrowserRuntime()} desktop={false} />);
  await screen.findByRole('tab', { name: 'Partida' });
  expect(screen.queryByRole('combobox', { name: 'Modo de exibição' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Overlay' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Modo de exibição' }), { target: { value: 'compact' } });
  await waitFor(() => expect((screen.getByRole('combobox', { name: 'Modo de exibição' }) as HTMLSelectElement).value).toBe('compact'));
  fireEvent.click(screen.getByRole('tab', { name: 'Demonstração' }));
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar demonstração' }));
  await screen.findByRole('region', { name: 'Dados da partida em modo compacto' });
  fireEvent.click(screen.getByRole('tab', { name: 'Partida' }));
  expect(screen.queryByRole('button', { name: 'Encerrar demonstração' })).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Demonstração' }));
  expect((screen.getByRole('button', { name: 'Encerrar demonstração' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Demonstração' }), { key: 'ArrowLeft' });
  expect(screen.getByRole('tab', { name: 'Overlay' }).getAttribute('aria-selected')).toBe('true');
  expect((screen.getByRole('combobox', { name: 'Modo de exibição' }) as HTMLSelectElement).value).toBe('compact');
});
