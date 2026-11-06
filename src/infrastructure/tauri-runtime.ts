import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AppState, DiagnosticReport, DisplayMonitor, OverlayRuntime } from '../application/runtime';
import type { AppPreferences } from '../domain/preferences';
import type { MatchSnapshot } from '../domain/match';
import type { OverlaySettings } from '../domain/settings';
import type { PlayerProfile } from '../domain/detection';
import type { ProfileOverview } from '../domain/profile';

export class TauriRuntime implements OverlayRuntime {
  read() { return invoke<AppState>('read_state'); }
  selectGame(gameId: string) { return invoke<void>('select_game', { gameId }); }
  start(match: MatchSnapshot) { return invoke<void>('start_match', { incoming: match }); }
  finish() { return invoke<void>('finish_match'); }
  configure(settings: OverlaySettings, gameId?: string) { return invoke<void>('configure_overlay', { settings, gameId }); }
  syncLatest(completedOnly = false) { return invoke<void>('sync_latest_match', { completedOnly }); }
  listMonitors() { return invoke<DisplayMonitor[]>('list_monitors'); }
  toggleVisibility() { return invoke<void>('toggle_overlay_visibility'); }
  configureApp(preferences: AppPreferences) { return invoke<void>('configure_app', { preferences }); }
  setAutostart(enabled: boolean) { return invoke<void>('set_autostart', { enabled }); }
  closeApp(action: 'minimize' | 'exit' | 'cancel') { return invoke<void>('close_app', { action }); }
  initialized(elapsedMs: number) { return invoke<void>('app_initialized', { elapsedMs }); }
  diagnostics() { return invoke<DiagnosticReport>('diagnostics_report'); }
  retryDetection() { return invoke<void>('retry_detection'); }
  dismissAppError() { return invoke<void>('dismiss_app_error'); }
  identifyLocalProfile() { return invoke<PlayerProfile>('identify_local_profile'); }
  profileOverview() { return invoke<ProfileOverview>('profile_overview'); }
  configureDetection(enabled: boolean, profileInput: string, playerName?: string) {
    return invoke<void>('configure_detection', { enabled, profileInput, playerName: playerName ?? null });
  }
  subscribe(listener: (state: AppState) => void) {
    return listen<AppState>('state-changed', event => listener(event.payload));
  }
}
