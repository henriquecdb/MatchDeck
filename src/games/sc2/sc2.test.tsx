// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { defaultSettings } from '../../domain/settings';
import { MatchOverlay } from '../../features/overlay/MatchOverlay';
import { ControlPanel } from '../../features/settings/ControlPanel';
import { createSc2Demo } from './demo';
import { raceArtwork } from './catalog';
import { projectRating } from '../../domain/rating';
import { winRate } from '../../domain/match';
import { sc2DemoSession } from './demo';
import type { Sc2Session } from '../../domain/sc2-session';
import { useSc2Session } from './use-sc2-session';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('keeps SC2 preferences separate and restores them after switching games', async () => {
 const runtime=new BrowserRuntime(); await runtime.selectGame('sc2');
 await runtime.configure({...defaultSettings,opacity:0.65},'sc2');
 await runtime.selectGame('aoe2-de'); expect((await runtime.read()).settings.opacity).toBe(0.9);
 await runtime.selectGame('sc2'); expect((await runtime.read()).settings.opacity).toBe(0.65);
 await runtime.start(createSc2Demo('ranked'));
 await expect(runtime.selectGame('aoe4')).rejects.toThrow('encerre a demonstração');
 await runtime.finish(); expect((await new BrowserRuntime().read()).detection.config.gameId).toBe('sc2');
});

it('renders the two-row SC2 overlay without Age 2 projections or remote artwork', () => {
 const match=createSc2Demo('ranked'); render(<MatchOverlay match={match} display={defaultSettings} />);
 expect(screen.getByRole('region',{name:'Overlay StarCraft II'})).toBeTruthy();
 expect(screen.getByText('4417')).toBeTruthy(); expect(screen.getByAltText('Terran')).toBeTruthy();
 expect(projectRating(match,match.players[0])).toBeNull();
 expect(screen.queryByText(/Projeção Elo/)).toBeNull();
 expect(winRate({wins:1,losses:0,draws:1})).toBe('50.0%');
 for(const player of match.players)expect(existsSync('public'+raceArtwork(player).emblem)).toBe(true);
 expect(raceArtwork({...match.players[0],civilizationId:'../../unsafe'}).emblem).toBe('/sc2/races/unknown.svg');
 expect(raceArtwork({...match.players[0],civilizationId:'RANDOM'},'pt-BR').name).toBe('Aleatório');
});

it('selects SC2, offers a 1v1 demo and hides unsupported controls', async () => {
 const runtime=new BrowserRuntime(); render(<ControlPanel runtime={runtime} desktop={false} />);
 fireEvent.click(await screen.findByRole('button',{name:'StarCraft II Early Access'}));
 await screen.findByRole('textbox',{name:'ID do SC2 Pulse ou link do perfil SC2'});
 expect(screen.getByRole('button',{name:'Identificar perfil local'})).toBeTruthy();
 fireEvent.click(screen.getByRole('tab',{name:'Demonstração'}));
 expect(screen.queryByRole('combobox',{name:'Formato da demonstração'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Iniciar demonstração'}));
 await screen.findByRole('region',{name:'Overlay StarCraft II'});
 await waitFor(()=>expect((screen.getByRole('button',{name:/Trocar jogo:/}) as HTMLButtonElement).disabled).toBe(true));
 expect((await runtime.read()).match?.players).toHaveLength(2);
 fireEvent.click(screen.getByRole('tab',{name:'Overlay'}));
 expect(screen.queryByRole('checkbox',{name:'Exibir projeção não oficial de ganho/perda de rating'})).toBeNull();
 expect(screen.getByRole('checkbox',{name:'Mostrar partidas reais somente com o SC2 em primeiro plano'})).toBeTruthy();
 const sessionToggle = screen.getByRole('checkbox', { name: 'Mostrar sessão no overlay' });
 fireEvent.click(sessionToggle);
 await waitFor(async () => expect((await runtime.read()).settings.showSession).toBe(false));
});

it('shows only the matching active session in live games and keeps the demo fictional', () => {
 const match = { ...createSc2Demo('ranked'), source: 'live' as const, selfPlayerId: '42' };
 const session = { ...sc2DemoSession, profileId: 42 };
 const view = render(<MatchOverlay match={match} session={session} />);
 const bar = screen.getByRole('region', { name: 'Sessão de StarCraft II' });
 expect(within(bar).getByText('3V')).toBeTruthy();
 expect(within(bar).getByText('2D')).toBeTruthy();
 expect(within(bar).getByText('60%')).toBeTruthy();
 expect(within(bar).getAllByRole('listitem')).toHaveLength(5);
 view.rerender(<MatchOverlay match={match} session={{ ...session, profileId: 99 }} />);
 expect(screen.queryByRole('region', { name: 'Sessão de StarCraft II' })).toBeNull();
 view.rerender(<MatchOverlay match={match} session={{ ...session, endedAt: '2026-11-11T15:00:00Z' }} />);
 expect(screen.queryByRole('region', { name: 'Sessão de StarCraft II' })).toBeNull();
 view.rerender(<MatchOverlay match={match} session={session} display={{ ...defaultSettings, showSession: false }} />);
 expect(screen.queryByRole('region', { name: 'Sessão de StarCraft II' })).toBeNull();
 view.rerender(<MatchOverlay match={createSc2Demo('ranked')} session={{ ...session, matches: [] }} />);
 expect(screen.getByText('3V')).toBeTruthy();
});

it('receives live session updates and drops a previous profile before the next read completes', async () => {
 const runtime = new BrowserRuntime();
 let update: (session: Sc2Session) => void = () => {};
 const unsubscribe = vi.fn();
 vi.spyOn(runtime, 'subscribeSc2Session').mockImplementation(async listener => { update = listener; return unsubscribe; });
 const read = vi.spyOn(runtime, 'sc2Session').mockResolvedValue({ ...sc2DemoSession, profileId: 42, matches: [] });
 function Preview({ profileId }: { profileId: number }) {
   const session = useSc2Session(runtime, profileId, true);
   return <MatchOverlay match={{ ...createSc2Demo('ranked'), source: 'live', selfPlayerId: String(profileId) }} session={session} />;
 }
 const view = render(<Preview profileId={42} />);
 await screen.findByRole('region', { name: 'Sessão de StarCraft II' });
 act(() => update({ ...sc2DemoSession, profileId: 99 }));
 expect(screen.queryByText('3V')).toBeNull();
 act(() => update({ ...sc2DemoSession, profileId: 42 }));
 expect(screen.getByText('3V')).toBeTruthy();
 read.mockImplementation(() => new Promise(() => {}));
 view.rerender(<Preview profileId={99} />);
 expect(screen.queryByRole('region', { name: 'Sessão de StarCraft II' })).toBeNull();
 expect(unsubscribe).toHaveBeenCalled();
});

it('marks name-based opponent suggestions and honors hidden statistics', () => {
 const match=createSc2Demo('ranked');match.players[1].identityHint='name-region';
 const view=render(<MatchOverlay match={match} display={defaultSettings} />);
 expect(screen.getByText(/Perfil sugerido/)).toBeTruthy();
 expect(screen.getByTitle('Perfil sugerido por nome e região; o cliente não informa o ID global do adversário.')).toBeTruthy();
 view.rerender(<MatchOverlay match={match} display={{...defaultSettings,showRating:false,showRecord:false,showWinRate:false}} />);
 expect(screen.queryByText('4417')).toBeNull();expect(screen.queryByText('4470')).toBeNull();expect(screen.getByText('Nova')).toBeTruthy();
});

it('marks cached SC2 ratings while keeping their original values visible', () => {
 const match = createSc2Demo('ranked');
 match.players[0].statsCache = { fetchedAt: '2026-11-11T14:00:00Z', stale: true };
 const view = render(<MatchOverlay match={match} />);
 expect(screen.getByText('4417')).toBeTruthy();
 expect(screen.getByText(/^Cache /)).toBeTruthy();
 expect(screen.getByTitle(/^Cache de /)).toBeTruthy();
 view.rerender(<MatchOverlay match={match} display={{ ...defaultSettings, showRating: false, showRecord: false, showWinRate: false }} />);
 expect(screen.queryByTitle(/^Cache de /)).toBeNull();
});
