import { hotkeyError } from '../domain/hotkeys';
import type { AppState, OverlayRuntime } from '../application/runtime';
import { captureMatch, type MatchSnapshot } from '../domain/match';
import { defaultSettings, parseSettings, type OverlaySettings } from '../domain/settings';
import { defaultDetection, type PlayerProfile } from '../domain/detection';
import { defaultPreferences, parsePreferences, type AppPreferences } from '../domain/preferences';
import { gameIntegration } from '../games/registry';
import metadata from '../../package.json';
import type { ProfileOverview } from '../domain/profile';
import type { Sc2History, Sc2Session, Sc2SessionAction } from '../domain/sc2-session';

export class BrowserRuntime implements OverlayRuntime {
  private state: AppState = { match: null, settings: { ...defaultSettings }, detection: structuredClone(defaultDetection), shortcutAvailable: false, visibilityShortcutAvailable: false, hiddenMatchId: null, lastSynced: null, preferences: { ...defaultPreferences }, autostart: false, trayAvailable: false, closeRequested: false, startupMs: null, appError: null };
  private listeners = new Set<(state: AppState) => void>();

  constructor() {
    const savedGame = localStorage.getItem('matchdeck.activeGame');
    this.state.detection.config.gameId = savedGame && gameIntegration(savedGame) ? savedGame : 'aoe2-de';
    try {
      this.state.settings = parseSettings(JSON.parse(localStorage.getItem(`matchdeck.games.${this.state.detection.config.gameId}.settings`) ?? (this.state.detection.config.gameId === 'aoe2-de' ? localStorage.getItem('matchdeck.settings') : null) ?? 'null'));
    } catch {
      this.state.settings = { ...defaultSettings };
    }
    try { const saved = localStorage.getItem('matchdeck.preferences'); this.state.preferences = saved ? parsePreferences(JSON.parse(saved)) : { ...defaultPreferences, autoUpdate: this.state.settings.autoUpdate }; } catch { this.state.preferences = { ...defaultPreferences }; }
  }

  async read() { return structuredClone(this.state); }
  async configureApp(preferences: AppPreferences) { const normalized = parsePreferences(preferences); const error = hotkeyError(normalized.hotkeys); if (error) throw new Error(error); this.state.preferences = normalized; localStorage.setItem('matchdeck.preferences', JSON.stringify(this.state.preferences)); this.publish(); }
  async initialized(elapsedMs: number) { if (this.state.startupMs == null) { this.state.startupMs = Math.round(elapsedMs); this.publish(); } }
  async setAutostart(_enabled: boolean): Promise<void> { throw new Error('Inicialização com Windows disponível no aplicativo instalado.'); }
  async closeApp(_action: 'minimize' | 'exit' | 'cancel') { this.state.closeRequested = false; this.publish(); }
  async retryDetection(): Promise<void> { throw new Error('Detecção disponível no aplicativo Windows.'); }
  async dismissAppError() { this.state.appError = null; this.publish(); }
  async diagnostics() { return { version: metadata.version, platform: 'browser', source: 'Prévia fictícia', detection: { enabled: false, phase: 'disabled', lastChecked: null, failures: 0, retrySeconds: 20 }, startupMs: this.state.startupMs, trayAvailable: false, shortcuts: { lock: false, visibility: false }, events: [] }; }

  async syncLatest(): Promise<void> {
    throw new Error('A sincronização de partidas está disponível no aplicativo Windows.');
  }

  async profileOverview(): Promise<ProfileOverview> {
    throw new Error('Estatísticas disponíveis no aplicativo Windows.');
  }

  async sc2History(_profileId: number): Promise<Sc2History> { throw new Error('Histórico disponível no aplicativo Windows.'); }
  async subscribeSc2History(_listener: (history: Sc2History) => void) { return () => {}; }
  async sc2Session(_profileId: number, _action: Sc2SessionAction): Promise<Sc2Session | null> {
    throw new Error('Sessões disponíveis no aplicativo Windows.');
  }

  async subscribeSc2Session(_listener: (session: Sc2Session) => void) {
    return () => {};
  }

  async identifyLocalProfile(): Promise<PlayerProfile> {
    throw new Error('A identificação local está disponível no aplicativo Windows. Execute npm run desktop.');
  }

  async configureDetection(_enabled: boolean, _profileInput: string): Promise<void> {
    throw new Error('A detecção real está disponível no aplicativo Windows. Execute npm run desktop.');
  }

  async selectGame(gameId: string) {
    if (!gameIntegration(gameId)) throw new Error('Integração de jogo indisponível');
    if (this.state.detection.config.gameId === gameId) return;
    if (this.state.match) throw new Error('Desative a detecção e encerre a demonstração para trocar de jogo');
    localStorage.setItem('matchdeck.activeGame', gameId);
    try { this.state.settings = parseSettings(JSON.parse(localStorage.getItem(`matchdeck.games.${gameId}.settings`) ?? 'null')); }
    catch { this.state.settings = { ...defaultSettings }; }
    this.state.detection = structuredClone(defaultDetection);
    this.state.detection.config.gameId = gameId;
    this.state.lastSynced = null; this.state.hiddenMatchId = null;
    this.publish();
  }

  async start(match: MatchSnapshot) {
    if (match.gameId !== this.state.detection.config.gameId) throw new Error('A demonstração deve corresponder ao jogo selecionado');
    this.state.match = captureMatch(this.state.match, match);
    this.publish();
  }

  async finish() {
    this.state.match = null;
    this.state.hiddenMatchId = null;
    this.publish();
  }

  async listMonitors() { return []; }

  async toggleVisibility() {
    const id = this.state.match?.id ?? null;
    this.state.hiddenMatchId = this.state.hiddenMatchId === id ? null : id;
    this.publish();
  }

  async configure(settings: OverlaySettings, gameId?: string) {
    if (gameId && gameId !== this.state.detection.config.gameId) throw new Error('O jogo foi alterado; tente novamente');
    const normalized = parseSettings(settings);
    localStorage.setItem(`matchdeck.games.${this.state.detection.config.gameId}.settings`, JSON.stringify(normalized));
    this.state.settings = normalized;
    this.publish();
  }

  async subscribe(listener: (state: AppState) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private publish() {
    for (const listener of this.listeners) listener(structuredClone(this.state));
  }
}
