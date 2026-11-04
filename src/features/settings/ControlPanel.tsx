import { LanguageProvider, startupPreferences, useI18n } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import type { DisplayMonitor, OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { replayMatch } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { gameIntegration, installedGames } from '../../games/registry';
import { DetectionPanel } from '../detection/DetectionPanel';
import { UpdatePanel } from '../updates/UpdatePanel';
import { DemoPanel } from '../demo/DemoPanel';
import { appTabs, type AppTab } from '../shell/AppTabs';
import { LoadingScreen } from '../shell/LoadingScreen';
import { OverlaySettingsPanel } from './OverlaySettingsPanel';
import { OverlayPreview } from '../overlay/OverlayPreview';
import { AppLayout } from '../shell/AppLayout';
import { GeneralSettings } from './GeneralSettings';
import { CloseDialog } from './CloseDialog';
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel';
import { Onboarding } from '../onboarding/Onboarding';
import { LastResult } from '../match/LastResult';
import { hotkeyLabel } from '../../domain/hotkeys';
import { ProfilePanel } from '../profile/ProfilePanel';

export function ControlPanel({ runtime, desktop }: { runtime: OverlayRuntime; desktop: boolean }) {
  const runtimeState = useRuntime(runtime);
  const initialPreferences = useMemo(startupPreferences, []);
  return <LanguageProvider preferences={runtimeState.ready ? runtimeState.state.preferences : initialPreferences}><ControlPanelContent runtime={runtime} desktop={desktop} runtimeState={runtimeState} /></LanguageProvider>;
}

function ControlPanelContent({ runtime, desktop, runtimeState }: { runtime: OverlayRuntime; desktop: boolean; runtimeState: ReturnType<typeof useRuntime> }) {
  const { t } = useI18n();
  const { state, ready, error, perform, retry } = runtimeState;
  const [activeTab, setActiveTab] = useState<AppTab>('match');
  const [monitors, setMonitors] = useState<DisplayMonitor[]>([]);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const refreshMonitors = () => { setMonitorError(null); void runtime.listMonitors().then(setMonitors).catch(cause => setMonitorError(String(cause))); };
  useEffect(() => { if (ready && activeTab === 'overlay') { let disposed = false; void runtime.listMonitors().then(value => { if (!disposed) { setMonitors(value); setMonitorError(null); } }).catch(cause => { if (!disposed) setMonitorError(String(cause)); }); return () => { disposed = true; }; } }, [runtime, ready, activeTab]);
  const sample = useMemo(() => gameIntegration('aoe2-de')!.demo('ranked'), []);
  const { settings, match } = state;
  const preview = match ?? (state.lastSynced ? replayMatch(state.lastSynced) : sample);
  const configure = (patch: Partial<OverlaySettings>) => void perform(() => runtime.configure({ ...settings, ...patch }));

  if (!ready) return <LoadingScreen error={error} onRetry={retry} />;

  return <AppLayout active={activeTab} onChange={setActiveTab} gameName={installedGames[0].name} status={match ? match.source === 'demo' ? t('Em demonstração') : t('Em partida') : t('Pronto')} sessionActive={!!match}>
    {!desktop && <p className="notice">{t('Prévia no navegador. O overlay sobre o jogo funciona no aplicativo Windows.')}</p>}
    {!state.preferences.onboardingComplete && <Onboarding state={state} runtime={runtime} onStep={setActiveTab} perform={perform} />}
    {error && <p role="alert" className="error">{t(error)}</p>}
    {state.appError && <div role="alert" className="error">{t(state.appError)} <button onClick={() => void perform(() => runtime.dismissAppError())}>{t('Fechar aviso')}</button></div>}
    {state.closeRequested && <CloseDialog state={state} runtime={runtime} perform={perform} />}
    {appTabs.map(tab => <section key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={activeTab !== tab.id} className="app-panel">
      {tab.id === 'match' && <>
        <div className="section-heading"><h2>{t('Partida')}</h2></div>
        <DetectionPanel runtime={runtime} status={state.detection} desktop={desktop} ready={ready} />
        {match && <div className="session-summary"><strong>{match.map}</strong><span>{match.players.map(player => player.name).join(' × ')}</span><p>{state.hiddenMatchId === match.id ? t('Overlay oculto; detecção ativa.') : settings.focusOnly && match.source === 'live' ? t("Visível com o Age 2 em foco.") : t('Visível ao trocar de janela.')}</p>
          <button onClick={() => void perform(() => runtime.toggleVisibility())}>{state.hiddenMatchId === match.id ? t('Mostrar nesta partida') : t('Ocultar nesta partida')}</button></div>}
        {match && <p>{state.preferences.hotkeys.toggleOverlay ? state.visibilityShortcutAvailable ? t('Mostrar/ocultar: {0}', { 0: hotkeyLabel(state.preferences.hotkeys.toggleOverlay) }) : t('Atalho indisponível. Use o botão da partida.') : t('Atalho desativado. Use o botão da partida.')}</p>}
        {match?.warnings?.map(warning => <p role="status" key={warning}>{t(warning)}</p>)}
        <LastResult match={state.lastSynced} />
      </>}
      {tab.id === 'profile' && <ProfilePanel runtime={runtime} profile={state.detection.config.profile} desktop={desktop} visible={activeTab === 'profile'} onLink={() => setActiveTab('match')} />}
      {tab.id === 'overlay' && <>
        <div className="section-heading"><h2>{t('Overlay')}</h2><p>{t('Aparência e posição do overlay.')}</p></div>
        <OverlaySettingsPanel settings={settings} match={match} desktop={desktop} shortcutAvailable={state.shortcutAvailable} lockShortcut={state.preferences.hotkeys.lockOverlay} onChange={configure} monitors={monitors} onRefreshMonitors={refreshMonitors} monitorError={monitorError} />
        <OverlayPreview match={preview} settings={settings} />
      </>}
      {tab.id === 'demo' && <><div className="section-heading"><h2>{t('Demonstração')}</h2><p>{t('Teste sem entrar no jogo.')}</p></div><DemoPanel runtime={runtime} state={state} desktop={desktop} perform={perform} /></>}
      {tab.id === 'updates' && <UpdatePanel desktop={desktop} visible={activeTab === 'updates'} busy={!!match || state.detection.config.enabled} autoUpdate={state.preferences.autoUpdate} onAutoUpdateChange={autoUpdate => void perform(() => runtime.configureApp({ ...state.preferences, autoUpdate }))} />}
      {tab.id === 'settings' && <GeneralSettings state={state} runtime={runtime} desktop={desktop} perform={perform} />}
      {tab.id === 'diagnostics' && <DiagnosticsPanel state={state} runtime={runtime} />}
    </section>)}
  </AppLayout>;
}
