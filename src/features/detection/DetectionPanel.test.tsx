// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DetectionPanel } from './DetectionPanel';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { defaultDetection } from '../../domain/detection';

afterEach(()=>{ cleanup();vi.restoreAllMocks();localStorage.clear(); });
it.each(['aoe4','sc2'])('identifies a local %s profile without activating detection automatically',async gameId=>{
 const runtime=new BrowserRuntime();
 const identify=vi.spyOn(runtime,'identifyLocalProfile').mockResolvedValue({profileId:42,name:'Nova'});
 const configure=vi.spyOn(runtime,'configureDetection').mockResolvedValue();
 render(<DetectionPanel runtime={runtime} status={{...defaultDetection,config:{enabled:false,profile:null,gameId}}} desktop ready />);
 fireEvent.click(screen.getByRole('button',{name:'Identificar perfil local'}));
 await waitFor(()=>expect((screen.getByPlaceholderText('ID numérico') as HTMLInputElement).value).toBe('42'));
 expect(screen.getByText(/Nova/)).toBeTruthy();expect(identify).toHaveBeenCalledTimes(1);expect(configure).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Ativar detecção'}));
 await waitFor(()=>expect(configure).toHaveBeenCalledWith(...(gameId === 'sc2' ? [true,'42','Nova'] : [true,'42'])));
});
it('does not overwrite manual input or pick a profile when discovery is ambiguous',async()=>{
 const runtime=new BrowserRuntime();vi.spyOn(runtime,'identifyLocalProfile').mockRejectedValue('Mais de um perfil local encontrado. Informe o ID ou link do perfil desejado.');
 const configure=vi.spyOn(runtime,'configureDetection');
 render(<DetectionPanel runtime={runtime} status={{...defaultDetection,config:{enabled:false,profile:null,gameId:'sc2'}}} desktop ready />);
 fireEvent.change(screen.getByPlaceholderText('ID numérico'),{target:{value:'999'}});fireEvent.click(screen.getByRole('button',{name:'Identificar perfil local'}));
 expect((await screen.findByRole('alert')).textContent).toContain('Mais de um perfil');expect((screen.getByPlaceholderText('ID numérico') as HTMLInputElement).value).toBe('999');expect(configure).not.toHaveBeenCalled();
});

it('links an SC2 ID with an explicit in-game name when Pulse has no public name',async()=>{
 const runtime=new BrowserRuntime();const configure=vi.spyOn(runtime,'configureDetection').mockResolvedValue();
 render(<DetectionPanel runtime={runtime} status={{...defaultDetection,config:{enabled:false,profile:null,gameId:'sc2'}}} desktop ready />);
 fireEvent.change(screen.getByPlaceholderText('ID numérico'),{target:{value:'2592068'}});
 fireEvent.change(screen.getByLabelText(/Nome no jogo/),{target:{value:'Kadmus'}});
 fireEvent.click(screen.getByRole('button',{name:'Ativar detecção'}));
 await waitFor(()=>expect(configure).toHaveBeenCalledWith(true,'2592068','Kadmus'));
});

it('preserves the manual character name when local discovery returns a Pulse placeholder', async () => {
 const runtime = new BrowserRuntime();
 vi.spyOn(runtime, 'identifyLocalProfile').mockResolvedValue({profileId:2592068,name:'SC2 #2592068'});
 const configure = vi.spyOn(runtime, 'configureDetection').mockResolvedValue();
 render(<DetectionPanel runtime={runtime} status={{...defaultDetection,config:{enabled:false,profile:null,gameId:'sc2'}}} desktop ready />);
 fireEvent.change(screen.getByLabelText(/Nome no jogo/),{target:{value:'Kadmus'}});
 fireEvent.click(screen.getByRole('button',{name:'Identificar perfil local'}));
 await waitFor(()=>expect((screen.getByPlaceholderText('ID numérico') as HTMLInputElement).value).toBe('2592068'));
 expect((screen.getByLabelText(/Nome no jogo/) as HTMLInputElement).value).toBe('Kadmus');
 fireEvent.click(screen.getByRole('button',{name:'Ativar detecção'}));
 await waitFor(()=>expect(configure).toHaveBeenCalledWith(true,'2592068','Kadmus'));
});
