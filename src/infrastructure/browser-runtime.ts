import { hotkeyError } from '../domain/hotkeys';
import type { AppState, OverlayRuntime } from '../application/runtime';
import { captureMatch, type MatchSnapshot } from '../domain/match';
import { defaultSettings, parseSettings, type OverlaySettings } from '../domain/settings';
import { defaultDetection, type PlayerProfile } from '../domain/detection';
import { defaultPreferences, parsePreferences, type AppPreferences } from '../domain/preferences';
import metadata from '../../package.json';
import type { ProfileOverview } from '../domain/profile';

export class BrowserRuntime implements OverlayRuntime {
  private state: AppState = { match: null, settings: { ...defaultSettings }, detection: structuredClone(defaultDetection), shortcutAvailable: false, visibilityShortcutAvailable: false, hiddenMatchId: null, lastSynced: null, preferences: { ...defaultPreferences }, autostart: false, trayAvailable: false, closeRequested: false, startupMs: null, appError: null };
  private listeners = new Set<(state: AppState) => void>();

  constructor() {
    try {
      this.state.settings = parseSettings(JSON.parse(localStorage.getItem('matchdeck.games.aoe2-de.settings') ?? localStorage.getItem('matchdeck.settings') ?? 'null'));
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

  async identifyLocalProfile(): Promise<PlayerProfile> {
    throw new Error('A identificação local está disponível no aplicativo Windows. Execute npm run desktop.');
  }

  async configureDetection(_enabled: boolean, _profileInput: string): Promise<void> {
    throw new Error('A detecção real está disponível no aplicativo Windows. Execute npm run desktop.');
  }

  async start(match: MatchSnapshot) {
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

  async configure(settings: OverlaySettings) {
    const normalized = parseSettings(settings);
    localStorage.setItem('matchdeck.games.aoe2-de.settings', JSON.stringify(normalized));
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
