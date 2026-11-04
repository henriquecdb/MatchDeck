// @vitest-environment happy-dom
import { beforeEach } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { ControlPanel } from './ControlPanel';
import { defaultHotkeys, hotkeyError } from '../../domain/hotkeys';

afterEach(() => { cleanup(); localStorage.clear(); });

it('migrates defaults and rejects duplicate or unmodified typing keys', () => {
  expect(hotkeyError(defaultHotkeys)).toBeNull();
  expect(hotkeyError({ lockOverlay: 'H', toggleOverlay: null })).not.toBeNull();
  expect(hotkeyError({ lockOverlay: 'F8', toggleOverlay: null })).toBeNull();
  expect(hotkeyError({ lockOverlay: 'Ctrl+Shift+H', toggleOverlay: 'Ctrl+Shift+H' })).toContain('diferente');
});

it('saves independent hotkeys, preserves a draft during runtime updates, and restores defaults', async () => {
  const runtime = new BrowserRuntime();
  render(<ControlPanel runtime={runtime} desktop={false} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Configurações' }));
  const lock = screen.getByRole('group', { name: 'Travar/destravar overlay' });
  fireEvent.change(within(lock).getByRole('combobox', { name: 'Tecla' }), { target: { value: 'K' } });
  await runtime.initialized(100);
  expect(within(lock).getByRole('combobox', { name: 'Tecla' })).toHaveProperty('value', 'K');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar atalhos' }));
  await waitFor(async () => expect((await runtime.read()).preferences.hotkeys.lockOverlay).toBe('Ctrl+Shift+K'));
  const toggle = screen.getByRole('group', { name: 'Mostrar/ocultar overlay' });
  fireEvent.click(within(toggle).getByRole('checkbox', { name: 'Ativado' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar atalhos' }));
  await waitFor(async () => expect((await new BrowserRuntime().read()).preferences.hotkeys.toggleOverlay).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar atalhos padrão' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar atalhos' }));
  await waitFor(async () => expect((await runtime.read()).preferences.hotkeys).toEqual(defaultHotkeys));
});

it('rejects invalid browser settings without replacing saved preferences', async () => {
  const runtime = new BrowserRuntime();
  const original = (await runtime.read()).preferences;
  await expect(runtime.configureApp({ ...original, hotkeys: { lockOverlay: 'Ctrl+H', toggleOverlay: 'Ctrl+H' } })).rejects.toThrow('diferente');
  expect((await runtime.read()).preferences).toEqual(original);
});

beforeEach(() => { localStorage.setItem('matchdeck.preferences', JSON.stringify({ openLastGame: true })); });
