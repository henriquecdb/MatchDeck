// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { ProfilePanel } from './ProfilePanel';
import type { ProfileOverview } from '../../domain/profile';
import { profileWinRate } from '../../domain/profile';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { defaultPreferences } from '../../domain/preferences';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const overview: ProfileOverview = {
  profileId: 42, name: 'Player', fetchedAt: '2026-11-03T10:00:00Z',
  leaderboards: [
    { leaderboardId: 'rm_1v1', rating: 1500, wins: 30, losses: 10 },
    { leaderboardId: 'qp_rm_1v1', rating: 1100, wins: null, losses: 0 },
  ],
  recentMatches: Array.from({ length: 5 }, (_, index) => ({
    id: String(index), startedAt: '2026-11-03T09:00:00Z', queueId: 'qp_rm_1v1', map: 'Arabia',
    civilizationId: 'franks', civilization: 'Franks', won: index === 0 ? null : index % 2 === 0,
    ratingChange: index === 0 ? null : index % 2 === 0 ? 12 : -8,
  })),
};

it('loads only when visible, separates queues and reuses its cache after a manual refresh', async () => {
  const runtime = new BrowserRuntime();
  const load = vi.spyOn(runtime, 'profileOverview').mockResolvedValue(overview);
  const props = { runtime, profile: { profileId: 42, name: 'Player' }, desktop: true, onLink: vi.fn() };
  const view = render(<ProfilePanel {...props} visible={false} />);
  expect(load).not.toHaveBeenCalled();
  view.rerender(<ProfilePanel {...props} visible />);
  await screen.findByText('1100');
  expect(screen.queryByText('1500')).toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'Modalidade' }), { target: { value: 'rm_1v1' } });
  expect(screen.getByText('1500')).toBeTruthy();
  expect(screen.getByText('75%')).toBeTruthy();
  const history = screen.getByRole('region', { name: 'Últimas 5 partidas' });
  expect(within(history).getAllByRole('listitem')).toHaveLength(5);
  expect(within(history).getByText('Sem resultado')).toBeTruthy();
  expect(within(history).getAllByText('Derrota')).toHaveLength(2);
  expect(within(history).getAllByText('Vitória')).toHaveLength(2);
  expect(within(history).getAllByText('Franks')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar perfil' }));
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar perfil' })).toHaveProperty('disabled', false));
  view.rerender(<ProfilePanel {...props} visible={false} />);
  view.rerender(<ProfilePanel {...props} visible />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar perfil' })).toHaveProperty('disabled', false));
  expect(load).toHaveBeenCalledTimes(2);
  expect(profileWinRate(overview.leaderboards[1])).toBeNull();
  expect(profileWinRate({ leaderboardId: 'rm_1v1', rating: 1000, wins: 0, losses: 0 })).toBeNull();
});

it('retains previous data with a visible error when refresh fails', async () => {
  const runtime = new BrowserRuntime();
  vi.spyOn(runtime, 'profileOverview').mockResolvedValueOnce(overview).mockRejectedValueOnce(new Error('Offline'));
  render(<ProfilePanel runtime={runtime} profile={{ profileId: 42, name: 'Player' }} desktop visible onLink={vi.fn()} />);
  await screen.findByText('1100');
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar perfil' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Offline');
  expect(screen.getByText('1100')).toBeTruthy();
});

it('does not show a previous profile while a new request is pending', async () => {
  const runtime = new BrowserRuntime();
  vi.spyOn(runtime, 'profileOverview').mockResolvedValueOnce(overview).mockImplementation(() => new Promise(() => {}));
  const props = { runtime, desktop: true, visible: true, onLink: vi.fn() };
  const view = render(<ProfilePanel {...props} profile={{ profileId: 42, name: 'Player' }} />);
  await screen.findByText('1100');
  view.rerender(<ProfilePanel {...props} profile={{ profileId: 99, name: 'Other player' }} />);
  expect(screen.queryByText('1100')).toBeNull();
  expect(screen.getByText('Other player')).toBeTruthy();
});

it('supports English interface and independent Portuguese civilization names', async () => {
  const runtime = new BrowserRuntime();
  vi.spyOn(runtime, 'profileOverview').mockResolvedValue(overview);
  render(<LanguageProvider preferences={{ ...defaultPreferences, language: 'en', gameLanguage: 'pt-BR' }}><ProfilePanel runtime={runtime} profile={{ profileId: 42, name: 'Player' }} desktop visible onLink={vi.fn()} /></LanguageProvider>);
  await screen.findByRole('region', { name: 'Last 5 matches' });
  expect(screen.getAllByText('Francos')).toHaveLength(5);
  expect(screen.getByText('Unknown result')).toBeTruthy();
  expect(screen.getAllByText('Loss')).toHaveLength(2);
});

it('guides unlinked users without issuing requests', () => {
  const runtime = new BrowserRuntime();
  const load = vi.spyOn(runtime, 'profileOverview');
  const onLink = vi.fn();
  render(<ProfilePanel runtime={runtime} profile={null} desktop visible onLink={onLink} />);
  fireEvent.click(screen.getByRole('button', { name: 'Vincular perfil' }));
  expect(onLink).toHaveBeenCalledOnce();
  expect(load).not.toHaveBeenCalled();
});

it('loads Age 4 statistics, local civilization art and separate MMR history', async () => {
  const runtime = new BrowserRuntime();
  const load = vi.spyOn(runtime, 'profileOverview').mockResolvedValue({
    ...overview,
    leaderboards: [
      { leaderboardId: 'rm_solo', rating: 1400, wins: 20, losses: 10, season: 14, ratingHistory: [{ recordedAt: '2026-11-01T10:00:00Z', rating: 1380 }, { recordedAt: '2026-11-04T10:00:00Z', rating: 1400 }] },
      { leaderboardId: 'rm_1v1_elo', rating: 1600, wins: null, losses: null, ratingHistory: [] },
    ],
    recentMatches: [{ ...overview.recentMatches[0], queueId: 'rm_solo', civilizationId: 'english', civilization: 'english' }],
  });
  render(<LanguageProvider preferences={{ ...defaultPreferences, language: 'en', gameLanguage: 'pt-BR' }}><ProfilePanel runtime={runtime} gameId="aoe4" profile={{ profileId: 42, name: 'Player' }} desktop visible onLink={vi.fn()} /></LanguageProvider>);
  await screen.findByText('Ranked points');
  expect(screen.getByText('Ingleses')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Ingleses emblem' }).getAttribute('src')).toBe('/aoe4/flags/english.png');
  expect(screen.getByText(/Season 14/)).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Rating records' })).getAllByRole('button')).toHaveLength(2);
  fireEvent.change(screen.getByRole('combobox', { name: 'Queue' }), { target: { value: 'rm_1v1_elo' } });
  expect(screen.getByText('1600')).toBeTruthy();
  expect(screen.getByText('No published rating history for this mode.')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('shows separate Age 2 ranked and quick 1v1 histories without fetching on queue changes', async () => {
  const runtime = new BrowserRuntime();
  const load = vi.spyOn(runtime, 'profileOverview').mockResolvedValue({
    ...overview, leaderboards: [
      { leaderboardId: 'rm_1v1', rating: 1500, wins: 20, losses: 10, ratingHistory: [{ recordedAt: '2026-11-01T10:00:00Z', rating: 1490 }, { recordedAt: '2026-11-02T10:00:00Z', rating: 1500 }] },
      { leaderboardId: 'qp_rm_1v1', rating: 1100, wins: 30, losses: 15, ratingHistory: [{ recordedAt: '2026-11-01T10:00:00Z', rating: 1090 }] },
      { leaderboardId: 'rm_team', rating: 1800, wins: 10, losses: 10 },
      { leaderboardId: 'qp_ew_1v1', rating: 1300, wins: 10, losses: 10, ratingHistory: [] },
    ],
  });
  render(<ProfilePanel runtime={runtime} gameId="aoe2-de" profile={{ profileId: 42, name: 'Player' }} desktop visible onLink={vi.fn()} />);
  const quick = await screen.findByRole('region', { name: 'Evolução de rating' });
  expect(within(quick).getByText('1.090')).toBeTruthy();
  const queue = screen.getByRole('combobox', { name: 'Modalidade' });
  fireEvent.change(queue, { target: { value: 'rm_1v1' } });
  expect(within(screen.getByRole('region', { name: 'Evolução de rating' })).getByText('1.500')).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Registros de rating' })).getAllByRole('button')).toHaveLength(2);
  fireEvent.change(queue, { target: { value: 'rm_team' } });
  expect(screen.queryByRole('region', { name: 'Evolução de rating' })).toBeNull();
  expect(screen.getByText('1800')).toBeTruthy();
  fireEvent.change(queue, { target: { value: 'qp_ew_1v1' } });
  expect(screen.getByText('Sem histórico de rating publicado para esta modalidade.')).toBeTruthy();
  expect(screen.queryByText('1.500')).toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
});

it('reuses the profile layout for SC2 with races, MMR, draws and a season-specific chart', async () => {
 const runtime=new BrowserRuntime();const load=vi.spyOn(runtime,'profileOverview').mockResolvedValue({
  ...overview,leaderboards:[{leaderboardId:'sc2_1v1_terran',rating:4200,wins:10,losses:9,draws:1,season:68,ratingHistory:[{recordedAt:'2026-11-03T10:00:00Z',rating:4100}]}],
  recentMatches:[{...overview.recentMatches[0],queueId:'sc2_1v1_terran',civilizationId:'TERRAN',civilization:'TERRAN',won:null,draw:true}],
 });
 render(<ProfilePanel runtime={runtime} gameId="sc2" profile={{profileId:42,name:'Nova'}} desktop visible onLink={vi.fn()} />);
 await screen.findByText('MMR');expect(screen.getByText('50%')).toBeTruthy();expect(screen.getByText('Empates')).toBeTruthy();
 expect(screen.getByText('Empate')).toBeTruthy();expect(screen.getByRole('img',{name:'Emblema de Terran'}).getAttribute('src')).toBe('/sc2/races/terran.png');
 expect(screen.getByRole('region',{name:'Evolução de rating'})).toBeTruthy();expect(load).toHaveBeenCalledTimes(1);
});

it('keeps cached SC2 statistics visible and labels the fetch time and missing history', async () => {
  const runtime = new BrowserRuntime();
  vi.spyOn(runtime, 'profileOverview').mockResolvedValue({
    ...overview,
    statsCache: { fetchedAt: '2026-11-11T14:00:00Z', stale: true },
    warnings: ['Histórico indisponível.'],
    leaderboards: [{ leaderboardId: 'sc2_1v1_terran', rating: 4250, wins: 10, losses: 5 }],
    recentMatches: [],
  });
  render(<ProfilePanel runtime={runtime} gameId="sc2" profile={{ profileId: 42, name: 'Nova' }} desktop visible onLink={vi.fn()} />);
  await screen.findByText('4250');
  expect(screen.getByText(/^Cache de /, { selector: '.profile-cache' })).toBeTruthy();
  expect(screen.getByText('Histórico indisponível.')).toBeTruthy();
});
