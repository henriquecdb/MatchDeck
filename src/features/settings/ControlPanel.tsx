import { LanguageProvider, startupPreferences, useI18n } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DisplayMonitor, OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { replayMatch } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { gameIntegration } from '../../games/registry';
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
import { LatestResult } from '../match/LatestResult';
import { hotkeyLabel } from '../../domain/hotkeys';
import { GameLibrary } from '../games/GameLibrary';
import { AppHeader } from '../shell/AppHeader';
import { ProfilePanel } from '../profile/ProfilePanel';

export function ControlPanel({ runtime, desktop }: { runtime: OverlayRuntime; desktop: boolean }) {
  const runtimeState = useRuntime(runtime);
  const initialPreferences = useMemo(startupPreferences, []);
  return <LanguageProvider preferences={runtimeState.ready ? runtimeState.state.preferences : initialPreferences}><ControlPanelContent runtime={runtime} desktop={desktop} runtimeState={runtimeState} /></LanguageProvider>;
}

function ControlPanelContent({ runtime, desktop, runtimeState }: { runtime: OverlayRuntime; desktop: boolean; runtimeState: ReturnType<typeof useRuntime> }) {
  const { t } = useI18n();
  const { state, ready, error, perform, retry } = runtimeState;
  const gameId = state.detection.config.gameId ?? 'aoe2-de';
  const [entered, setEntered] = useState<boolean | null>(null);
  const [switchingGame, setSwitchingGame] = useState(false);
  const changing = useRef(false);
  const workspace = useRef<HTMLDivElement>(null);
  useEffect(() => { if (entered) workspace.current?.querySelector<HTMLButtonElement>('.game-picker-trigger')?.focus(); }, [entered]);
  useEffect(() => {
    if (ready && entered === null) setEntered(state.preferences.openLastGame || !!state.match || state.detection.config.enabled);
    else if (ready && state.match && entered === false) setEntered(true);
  }, [ready, entered, state.preferences.openLastGame, state.match, state.detection.config.enabled]);
  const [activeTab, setActiveTab] = useState<AppTab>('match');
  const [monitors, setMonitors] = useState<DisplayMonitor[]>([]);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const refreshMonitors = () => { setMonitorError(null); void runtime.listMonitors().then(setMonitors).catch(cause => setMonitorError(String(cause))); };
  useEffect(() => { if (ready && entered && activeTab === 'overlay') { let disposed = false; void runtime.listMonitors().then(value => { if (!disposed) { setMonitors(value); setMonitorError(null); } }).catch(cause => { if (!disposed) setMonitorError(String(cause)); }); return () => { disposed = true; }; } }, [runtime, ready, entered, activeTab]);
  const sample = useMemo(() => gameIntegration(gameId)!.demo('ranked'), [gameId]);
  const { settings, match } = state;
  const preview = match ?? (state.lastSynced ? replayMatch(state.lastSynced) : sample);
  const configure = (patch: Partial<OverlaySettings>) => void perform(() => runtime.configure({ ...settings, ...patch }, gameId));

  async function changeGame(action: () => Promise<void>) {
    if (changing.current) return;
    changing.current = true;
    setSwitchingGame(true);
    try { await perform(action); } finally { changing.current = false; setSwitchingGame(false); }
  }
  const selectGame = (id: string) => changeGame(async () => {
    await runtime.selectGame(id);
    setActiveTab('match');
    setEntered(true);
  });
  const openLibrary = () => void changeGame(async () => {
    if (match) return;
    if (state.detection.config.enabled) await runtime.configureDetection(false, state.detection.config.profile?.profileId.toString() ?? '');
    setEntered(false);
  });
  const alerts = <>
    {error && <p role="alert" className="error">{t(error)}</p>}
    {state.appError && <div role="alert" className="error">{t(state.appError)} <button onClick={() => void perform(() => runtime.dismissAppError())}>{t('Fechar aviso')}</button></div>}
    {state.closeRequested && <CloseDialog state={state} runtime={runtime} perform={perform} />}
  </>;
  if (!ready || entered === null) return <LoadingScreen error={error} onRetry={retry} />;

  return <>
  {!entered && <main className="app-shell game-library-shell">
    <AppHeader />
    <div className="library-alerts">{alerts}</div>
    <GameLibrary busy={switchingGame} openLastGame={state.preferences.openLastGame} onSelect={id => void selectGame(id)} onOpenLastChange={openLastGame => void changeGame(() => runtime.configureApp({ ...state.preferences, openLastGame }))} />
  </main>}

  <div ref={workspace} hidden={!entered}><AppLayout active={activeTab} onChange={setActiveTab} gameId={gameId} onSelectGame={selectGame} onGames={openLibrary} gameLocked={!!match} switchingGame={switchingGame} status={match ? match.source === 'demo' ? t('Em demonstração') : t('Em partida') : t('Pronto')} sessionActive={!!match}>
    {!desktop && <p className="notice">{t('Prévia no navegador. O overlay sobre o jogo funciona no aplicativo Windows.')}</p>}
    {!state.preferences.onboardingComplete && <Onboarding state={state} runtime={runtime} onStep={setActiveTab} perform={perform} />}
    {entered && alerts}
    {appTabs.map(tab => <section key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={activeTab !== tab.id} className="app-panel">
      {tab.id === 'match' && <>
        <div className="section-heading"><h2>{t('Partida')}</h2></div>
        <DetectionPanel key={gameId} runtime={runtime} status={state.detection} desktop={desktop} ready={ready} />
        {match && <div className="session-summary"><strong>{match.map}</strong><span>{match.players.map(player => player.name).join(' × ')}</span><p>{state.hiddenMatchId === match.id ? t('Overlay oculto; detecção ativa.') : settings.focusOnly && match.source === 'live' ? t('Visível com o jogo em foco.') : t('Visível ao trocar de janela.')}</p>
          <button onClick={() => void perform(() => runtime.toggleVisibility())}>{state.hiddenMatchId === match.id ? t('Mostrar nesta partida') : t('Ocultar nesta partida')}</button></div>}
        {match && <p>{state.preferences.hotkeys.toggleOverlay ? state.visibilityShortcutAvailable ? t('Mostrar/ocultar: {0}', { 0: hotkeyLabel(state.preferences.hotkeys.toggleOverlay) }) : t('Atalho indisponível. Use o botão da partida.') : t('Atalho desativado. Use o botão da partida.')}</p>}
        {match?.warnings?.map(warning => <p role="status" key={warning}>{t(warning)}</p>)}
        <LatestResult key={`${gameId}-${state.detection.config.profile?.profileId}`} runtime={runtime} state={state} active={desktop && ready && !!entered && activeTab === 'match'} />
      </>}
      {tab.id === 'profile' && <ProfilePanel key={gameId} gameId={gameId} runtime={runtime} profile={state.detection.config.profile} desktop={desktop} visible={!!entered && activeTab === 'profile'} onLink={() => setActiveTab('match')} />}
      {tab.id === 'overlay' && <>
        <div className="section-heading"><h2>{t('Overlay')}</h2><p>{t('Aparência e posição do overlay.')}</p></div>
        <OverlaySettingsPanel gameId={gameId} settings={settings} match={match} desktop={desktop} shortcutAvailable={state.shortcutAvailable} lockShortcut={state.preferences.hotkeys.lockOverlay} onChange={configure} monitors={monitors} onRefreshMonitors={refreshMonitors} monitorError={monitorError} />
        <OverlayPreview match={preview} settings={settings} />
      </>}
      {tab.id === 'demo' && <><div className="section-heading"><h2>{t('Demonstração')}</h2><p>{t('Teste sem entrar no jogo.')}</p></div><DemoPanel key={gameId} runtime={runtime} state={state} desktop={desktop} perform={perform} /></>}
      {tab.id === 'updates' && <UpdatePanel desktop={desktop} visible={!!entered && activeTab === 'updates'} busy={!!match || state.detection.config.enabled} autoUpdate={state.preferences.autoUpdate} onAutoUpdateChange={autoUpdate => void perform(() => runtime.configureApp({ ...state.preferences, autoUpdate }))} />}
      {tab.id === 'settings' && <GeneralSettings state={state} runtime={runtime} desktop={desktop} perform={perform} />}
      {tab.id === 'diagnostics' && <DiagnosticsPanel state={state} runtime={runtime} />}
    </section>)}
  </AppLayout></div>
  </>;
}
