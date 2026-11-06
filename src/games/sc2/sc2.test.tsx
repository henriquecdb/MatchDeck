// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { defaultSettings } from '../../domain/settings';
import { MatchOverlay } from '../../features/overlay/MatchOverlay';
import { ControlPanel } from '../../features/settings/ControlPanel';
import { createSc2Demo } from './demo';
import { raceArtwork } from './catalog';
import { projectRating } from '../../domain/rating';
import { winRate } from '../../domain/match';

afterEach(() => { cleanup(); localStorage.clear(); });

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
});

it('marks name-based opponent suggestions and honors hidden statistics', () => {
 const match=createSc2Demo('ranked');match.players[1].identityHint='name-region';
 const view=render(<MatchOverlay match={match} display={defaultSettings} />);
 expect(screen.getByText(/Perfil sugerido/)).toBeTruthy();
 expect(screen.getByTitle('Perfil sugerido por nome e região; o cliente não informa o ID global do adversário.')).toBeTruthy();
 view.rerender(<MatchOverlay match={match} display={{...defaultSettings,showRating:false,showRecord:false,showWinRate:false}} />);
 expect(screen.queryByText('4417')).toBeNull();expect(screen.queryByText('4470')).toBeNull();expect(screen.getByText('Nova')).toBeTruthy();
});
