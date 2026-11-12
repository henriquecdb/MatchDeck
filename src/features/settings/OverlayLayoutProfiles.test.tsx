// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { OverlayLayoutProfiles } from './OverlayLayoutProfiles';

afterEach(() => { cleanup(); localStorage.clear(); });

it('restores a saved configuration after later changes and keeps profiles isolated by game', async () => {
  const runtime = new BrowserRuntime();
  await runtime.selectGame('sc2');
  const original = { ...(await runtime.read()).settings, x: -1000, scale: 0.75, showSession: false };
  const view = render(<OverlayLayoutProfiles runtime={runtime} gameId="sc2" settings={original} />);
  fireEvent.click(screen.getByText('Perfis de layout'));
  const name = screen.getByRole('textbox', { name: 'Nome do perfil' });
  await waitFor(() => expect(name).toHaveProperty('disabled', false));
  fireEvent.change(name, { target: { value: 'Compacto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  await screen.findByText('Perfil salvo.');
  await runtime.configure({ ...original, x: 500, scale: 1.5, showSession: true });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar perfil' }));
  await screen.findByText('Perfil aplicado.');
  expect((await runtime.read()).settings).toMatchObject({ x: -1000, scale: 0.75, showSession: false });
  expect(await new BrowserRuntime().layoutProfiles('sc2', 'read')).toHaveLength(1);
  view.unmount();
  await runtime.selectGame('aoe4');
  expect(await runtime.layoutProfiles('aoe4', 'read')).toEqual([]);
  await runtime.selectGame('sc2');
  const profiles = await runtime.layoutProfiles('sc2', 'read');
  await expect(runtime.layoutProfiles('sc2', 'save', { name: 'compacto', settings: original })).rejects.toThrow('Já existe');
  await runtime.layoutProfiles('sc2', 'delete', { id: profiles[0].id });
  expect(await runtime.layoutProfiles('sc2', 'read')).toEqual([]);
});
