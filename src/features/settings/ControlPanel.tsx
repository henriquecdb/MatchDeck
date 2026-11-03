import { useEffect, useMemo, useState } from 'react';
import type { DisplayMonitor, OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { replayMatch } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { gameIntegration, installedGames } from '../../games/registry';
import { DetectionPanel } from '../detection/DetectionPanel';
import { UpdatePanel } from '../updates/UpdatePanel';
import { DemoPanel } from '../demo/DemoPanel';
import { AppTabs, appTabs, type AppTab } from '../shell/AppTabs';
import { LoadingScreen } from '../shell/LoadingScreen';
import { OverlaySettingsPanel } from './OverlaySettingsPanel';
import { OverlayPreview } from '../overlay/OverlayPreview';
import metadata from '../../../package.json';
import { GeneralSettings } from './GeneralSettings';
import { CloseDialog } from './CloseDialog';
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel';
import { Onboarding } from '../onboarding/Onboarding';
import { LastResult } from '../match/LastResult';

export function ControlPanel({ runtime, desktop }: { runtime: OverlayRuntime; desktop: boolean }) {
  const { state, ready, error, perform, retry } = useRuntime(runtime);
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

  return <main className="app-shell">
    <header className="app-heading">
      <div><h1>Match<span>Deck</span></h1><p>{installedGames[0].name}</p></div>
      <div className="app-version"><span className={`connection-badge ${match ? 'is-active' : ''}`}>{match ? (match.source === 'demo' ? 'Em demonstração' : 'Em partida') : 'Pronto'}</span><small>v{metadata.version}</small></div>
    </header>
    {!desktop && <p className="notice">Prévia no navegador. O overlay sobre o jogo funciona no aplicativo Windows.</p>}
    <AppTabs active={activeTab} onChange={setActiveTab} />
    {!state.preferences.onboardingComplete && <Onboarding state={state} runtime={runtime} onStep={setActiveTab} perform={perform} />}
    {error && <p role="alert" className="error">{error}</p>}
    {state.appError && <div role="alert" className="error">{state.appError} <button onClick={() => void perform(() => runtime.dismissAppError())}>Fechar aviso</button></div>}
    {state.closeRequested && <CloseDialog state={state} runtime={runtime} perform={perform} />}
    {appTabs.map(tab => <section key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={activeTab !== tab.id} className="app-panel">
      {tab.id === 'match' && <>
        <div className="section-heading"><h2>Conecte sua partida</h2><p>Escolha seu perfil e deixe o MatchDeck acompanhar o multiplayer.</p></div>
        <DetectionPanel runtime={runtime} status={state.detection} desktop={desktop} ready={ready} />
        {match && <div className="session-summary"><strong>{match.map}</strong><span>{match.players.map(player => player.name).join(' × ')}</span><p>{state.hiddenMatchId === match.id ? 'Overlay oculto nesta partida. A detecção continua ativa.' : settings.focusOnly && match.source === 'live' ? 'O overlay acompanha o foco do Age 2.' : 'O overlay permanece visível ao trocar de janela.'}</p>
          <button onClick={() => void perform(() => runtime.toggleVisibility())}>{state.hiddenMatchId === match.id ? 'Mostrar nesta partida' : 'Ocultar nesta partida'}</button></div>}
        <p>{state.visibilityShortcutAvailable ? 'Ctrl+Shift+H mostra ou oculta o overlay nesta partida.' : desktop ? 'Ctrl+Shift+H indisponível. Use o botão da partida para mostrar ou ocultar.' : 'Ctrl+Shift+H está disponível no aplicativo Windows quando o atalho estiver livre.'}</p>
        {match?.warnings?.map(warning => <p role="status" key={warning}>{warning}</p>)}
        <LastResult match={state.lastSynced} />
      </>}
      {tab.id === 'overlay' && <>
        <div className="section-heading"><h2>Do seu jeito</h2><p>Ajuste o visual e escolha onde as informações aparecem.</p></div>
        <OverlaySettingsPanel settings={settings} desktop={desktop} shortcutAvailable={state.shortcutAvailable} onChange={configure} monitors={monitors} onRefreshMonitors={refreshMonitors} monitorError={monitorError} />
        <OverlayPreview match={preview} settings={settings} />
      </>}
      {tab.id === 'demo' && <><div className="section-heading"><h2>Experimente o overlay</h2><p>Teste as informações e a posição antes de jogar.</p></div><DemoPanel runtime={runtime} state={state} desktop={desktop} perform={perform} /></>}
      {tab.id === 'updates' && <UpdatePanel desktop={desktop} visible={activeTab === 'updates'} busy={!!match || state.detection.config.enabled} autoUpdate={state.preferences.autoUpdate} onAutoUpdateChange={autoUpdate => void perform(() => runtime.configureApp({ ...state.preferences, autoUpdate }))} />}
      {tab.id === 'settings' && <GeneralSettings state={state} runtime={runtime} desktop={desktop} perform={perform} />}
      {tab.id === 'diagnostics' && <DiagnosticsPanel state={state} runtime={runtime} />}
    </section>)}
  </main>;
}
