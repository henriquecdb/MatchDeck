import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AppState, DiagnosticReport, DisplayMonitor, OverlayRuntime } from '../application/runtime';
import type { AppPreferences } from '../domain/preferences';
import type { MatchSnapshot } from '../domain/match';
import type { OverlaySettings } from '../domain/settings';
import type { PlayerProfile } from '../domain/detection';

export class TauriRuntime implements OverlayRuntime {
  read() { return invoke<AppState>('read_state'); }
  start(match: MatchSnapshot) { return invoke<void>('start_match', { incoming: match }); }
  finish() { return invoke<void>('finish_match'); }
  configure(settings: OverlaySettings) { return invoke<void>('configure_overlay', { settings }); }
  syncLatest() { return invoke<void>('sync_latest_match'); }
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
  configureDetection(enabled: boolean, profileInput: string) {
    return invoke<void>('configure_detection', { enabled, profileInput });
  }
  subscribe(listener: (state: AppState) => void) {
    return listen<AppState>('state-changed', event => listener(event.payload));
  }
}
