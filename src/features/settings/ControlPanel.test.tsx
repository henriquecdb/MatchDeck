// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import type { AppState } from '../../application/runtime';
import { ControlPanel } from './ControlPanel';

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
