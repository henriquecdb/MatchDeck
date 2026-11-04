// @vitest-environment happy-dom
import { beforeEach } from 'vitest';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { ControlPanel } from './ControlPanel';
import { CloseDialog } from './CloseDialog';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('opens without a forced delay and offers a preview of the loading screen', async () => {
  const runtime = new BrowserRuntime();
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('tab', { name: 'Configurações' });
  expect(screen.queryByRole('progressbar')).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
  await waitFor(() => expect(screen.getByText(/Interface pronta em/)).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Visualizar tela de carregamento' }));
  expect(screen.getByRole('dialog', { name: 'Prévia do carregamento' })).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Carregando aplicativo' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar prévia' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('recovers from a stalled initialization with a retry', async () => {
  vi.useFakeTimers();
  const runtime = new BrowserRuntime();
  const initial = await runtime.read();
  vi.spyOn(runtime, 'read').mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(initial);
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(15001); });
  expect(screen.getByRole('alert').textContent).toContain('demorando');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); });
  expect(screen.getByRole('tab', { name: 'Partida' })).toBeTruthy();
});

it('remembers a close choice without stopping the active match', async () => {
  const runtime = new BrowserRuntime();
  const state = await runtime.read();
  state.trayAvailable = true;
  const close = vi.spyOn(runtime, 'closeApp');
  render(<CloseDialog state={state} runtime={runtime} perform={action => action()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Lembrar minha escolha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar na bandeja' }));
  await waitFor(() => expect(close).toHaveBeenCalledWith('minimize'));
  expect((await runtime.read()).preferences.closeAction).toBe('minimize');
});

it('can complete and reopen the onboarding without changing overlay preferences', async () => {
  const runtime = new BrowserRuntime();
  const initial = (await runtime.read()).settings;
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('region', { name: 'Configuração guiada' });
  fireEvent.click(screen.getByRole('button', { name: 'Próximo passo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próximo passo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Concluir configuração' }));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Configuração guiada' })).toBeNull());
  expect((await runtime.read()).settings).toEqual(initial);
  fireEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reabrir configuração guiada' }));
  await screen.findByRole('region', { name: 'Configuração guiada' });
});

beforeEach(() => { localStorage.setItem('matchdeck.preferences', JSON.stringify({ openLastGame: true })); });
