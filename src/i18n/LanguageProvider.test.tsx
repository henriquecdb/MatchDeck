// @vitest-environment happy-dom
import { beforeEach } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { LanguageProvider, startupPreferences } from './LanguageProvider';
import { defaultPreferences, parsePreferences, type Language } from '../domain/preferences';
import { BrowserRuntime } from '../infrastructure/browser-runtime';
import { ControlPanel } from '../features/settings/ControlPanel';
import { MatchOverlay } from '../features/overlay/MatchOverlay';
import { createDemoMatch } from '../games/aoe2/demo';
import { translate, translateRuntimeMessage } from './translate';
import { localizedReleaseNotes } from '../domain/changelog';

afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.lang = 'pt-BR'; });

it('migrates old preferences independently and normalizes unsupported languages', () => {
  expect(parsePreferences({ autoUpdate: true })).toMatchObject({ language: 'pt-BR', gameLanguage: 'en', autoUpdate: true });
  expect(parsePreferences({ language: 'fr', gameLanguage: 'fr' })).toMatchObject({ language: 'pt-BR', gameLanguage: 'en' });
});

it('changes each language immediately during a demo and persists them without modifying the match', async () => {
  const runtime = new BrowserRuntime();
  await runtime.start(createDemoMatch('ranked'));
  const snapshot = (await runtime.read()).match;
  render(<ControlPanel runtime={runtime} desktop={false} />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Configurações' }));
  expect(screen.getByRole('combobox', { name: 'Civilizações e unidades' })).toHaveProperty('value', 'en');
  fireEvent.change(screen.getByRole('combobox', { name: 'Idioma da interface' }), { target: { value: 'en' } });
  await screen.findByRole('tab', { name: 'Settings' });
  expect(screen.getByRole('combobox', { name: 'Civilizations and units' })).toHaveProperty('value', 'en');
  fireEvent.change(screen.getByRole('combobox', { name: 'Civilizations and units' }), { target: { value: 'pt-BR' } });
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Civilizations and units' })).toHaveProperty('value', 'pt-BR'));
  expect(screen.getAllByText('Lançador de Machado').length).toBeGreaterThan(0);
  expect(screen.getByRole('tab', { name: 'Match' })).toBeTruthy();
  expect((await runtime.read()).match).toEqual(snapshot);
  expect((await new BrowserRuntime().read()).preferences).toMatchObject({ language: 'en', gameLanguage: 'pt-BR' });
  expect(startupPreferences().language).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  fireEvent.change(screen.getByRole('combobox', { name: 'Interface language' }), { target: { value: 'pt-BR' } });
  await screen.findByRole('tab', { name: 'Configurações' });
  expect(screen.getByRole('combobox', { name: 'Civilizações e unidades' })).toHaveProperty('value', 'pt-BR');
});

it.each(['pt-BR', 'en'] as Language[])('keeps %s interface independent from both game languages in both layouts', language => {
  const match = createDemoMatch('ranked');
  const before = structuredClone(match);
  for (const gameLanguage of ['en', 'pt-BR'] as Language[]) {
    for (const layout of ['detailed', 'compact'] as const) {
      const view = render(<LanguageProvider preferences={{ ...defaultPreferences, language, gameLanguage }}><MatchOverlay match={match} layout={layout} /></LanguageProvider>);
      expect(screen.getByRole('region', { name: language === 'en' ? layout === 'compact' ? 'Compact match data' : 'Match data' : layout === 'compact' ? 'Dados da partida em modo compacto' : 'Dados da partida' })).toBeTruthy();
      if (layout === 'detailed') {
        expect(screen.getByText(gameLanguage === 'en' ? 'Franks' : 'Francos')).toBeTruthy();
        expect(screen.getByText(gameLanguage === 'en' ? 'Throwing Axeman' : 'Lançador de Machado')).toBeTruthy();
      } else {
        expect(view.container.querySelector('.linear-player')?.getAttribute('title')).toContain(gameLanguage === 'en' ? 'Franks' : 'Francos');
        expect(screen.queryByRole('heading', { name: language === 'en' ? 'Team 1' : 'Equipe 1' })).toBeNull();
        expect(screen.getByRole('img', { name: language === 'en' ? `${gameLanguage === 'en' ? 'Franks' : 'Francos'} emblem` : `Emblema de ${gameLanguage === 'en' ? 'Franks' : 'Francos'}` })).toBeTruthy();
      }
      view.unmount();
    }
  }
  expect(match).toEqual(before);
});

it('translates runtime status, nested retry errors and dates without translating unknown source data', () => {
  expect(translateRuntimeMessage('Não foi possível conectar à fonte AoE2. Nova tentativa em 40 s. O overlay atual será mantido.', 'en')).toBe('Could not connect to the AoE2 source. Retrying in 40 s. The current overlay will be preserved.');
  expect(translateRuntimeMessage('Error: Verifique as atualizações novamente.', 'en')).toBe('Error: Check for updates again.');
  expect(translateRuntimeMessage('Estatísticas indisponíveis para pr∅xy', 'en')).toBe('Statistics unavailable for pr∅xy');
  expect(translateRuntimeMessage('Unknown system error', 'en')).toBe('Unknown system error');
  expect(translate('constructor', 'en')).toBe('constructor');
  expect(translate('Sincronizado em {0}', 'en', { 0: '11/3/2026' })).toBe('Synced at 11/3/2026');
});

it('selects bilingual release notes and preserves older single-language releases', () => {
  const notes = '<!-- language:pt-BR -->\n## Adicionado\nPortuguês\n<!-- language:en -->\n## Added\nEnglish';
  expect(localizedReleaseNotes(notes, 'en')).toBe('## Added\nEnglish');
  expect(localizedReleaseNotes(notes, 'pt-BR')).toBe('## Adicionado\nPortuguês');
  expect(localizedReleaseNotes('Older notes', 'en')).toBe('Older notes');
});

beforeEach(() => { localStorage.setItem('matchdeck.preferences', JSON.stringify({ openLastGame: true })); });
