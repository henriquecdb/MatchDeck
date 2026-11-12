// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { sc2DemoSession } from './demo';
import { Sc2MapStats } from './Sc2MapStats';

afterEach(cleanup);

it('shows only the selected map and updates its results when a replay arrives', () => {
  const sample = sc2DemoSession.matches[0];
  const session = { ...sc2DemoSession, matches: [
    { ...sample, id: 'a', map: 'Arena', won: true },
    { ...sample, id: 'b', map: 'Rainfall LE', won: false },
  ] };
  const view = render(<Sc2MapStats session={session} />);
  expect(screen.queryByRole('list')).toBeNull();
  fireEvent.click(screen.getByText('Consultar mapa'));
  const select = screen.getByRole('combobox', { name: 'Mapa' });
  fireEvent.change(select, { target: { value: 'Arena' } });
  let stats = screen.getByRole('list', { name: 'Por mapa' });
  expect(within(stats).getByText('1V · 0D · 100%')).toBeTruthy();
  expect(within(stats).queryByText('Rainfall LE')).toBeNull();
  fireEvent.change(select, { target: { value: 'Rainfall LE' } });
  stats = screen.getByRole('list', { name: 'Por mapa' });
  expect(within(stats).getByText('0V · 1D · 0%')).toBeTruthy();
  view.rerender(<Sc2MapStats session={{ ...session, matches: [...session.matches, { ...sample, id: 'c', map: 'Rainfall LE', won: true }] }} />);
  expect(within(screen.getByRole('list', { name: 'Por mapa' })).getByText('1V · 1D · 50%')).toBeTruthy();
  expect(screen.getByText('2 partidas')).toBeTruthy();
  fireEvent.change(select, { target: { value: '' } });
  expect(screen.queryByRole('list')).toBeNull();
});
