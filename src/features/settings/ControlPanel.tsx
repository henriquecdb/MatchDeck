import { useMemo, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { replayMatch } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { createDemoMatch } from '../../games/aoe2/demo';
import { DetectionPanel } from '../detection/DetectionPanel';
import { UpdatePanel } from '../updates/UpdatePanel';
import { DemoPanel } from '../demo/DemoPanel';
import { AppTabs, appTabs, type AppTab } from '../shell/AppTabs';
import { LoadingScreen } from '../shell/LoadingScreen';
import { OverlaySettingsPanel } from './OverlaySettingsPanel';
import { OverlayPreview } from '../overlay/OverlayPreview';
import metadata from '../../../package.json';

export function ControlPanel({ runtime, desktop }: { runtime: OverlayRuntime; desktop: boolean }) {
  const { state, ready, error, perform, retry } = useRuntime(runtime);
  const [activeTab, setActiveTab] = useState<AppTab>('match');
  const sample = useMemo(() => createDemoMatch('ranked'), []);
  const { settings, match } = state;
  const preview = match ?? (state.lastSynced ? replayMatch(state.lastSynced) : sample);
  const configure = (patch: Partial<OverlaySettings>) => void perform(() => runtime.configure({ ...settings, ...patch }));

  if (!ready) return <LoadingScreen error={error} onRetry={retry} />;

  return <main className="app-shell">
    <header className="app-heading">
      <div><h1>Match<span>Deck</span></h1><p>Seu jogo, em perspectiva.</p></div>
      <div className="app-version"><span className={`connection-badge ${match ? 'is-active' : ''}`}>{match ? (match.source === 'demo' ? 'Em demonstração' : 'Em partida') : 'Pronto'}</span><small>v{metadata.version}</small></div>
    </header>
    {!desktop && <p className="notice">Prévia no navegador. O overlay sobre o jogo funciona no aplicativo Windows.</p>}
    <AppTabs active={activeTab} onChange={setActiveTab} />
    {error && <p role="alert" className="error">{error}</p>}
    {appTabs.map(tab => <section key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={activeTab !== tab.id} className="app-panel">
      {tab.id === 'match' && <>
        <div className="section-heading"><h2>Conecte sua partida</h2><p>Escolha seu perfil e deixe o MatchDeck acompanhar o multiplayer.</p></div>
        <DetectionPanel runtime={runtime} status={state.detection} desktop={desktop} ready={ready} />
        {match && <div className="session-summary"><strong>{match.map}</strong><span>{match.players.map(player => player.name).join(' × ')}</span><p>O overlay continua visível enquanto você navega pelas abas.</p></div>}
        {match?.warnings?.map(warning => <p role="status" key={warning}>{warning}</p>)}
      </>}
      {tab.id === 'overlay' && <>
        <div className="section-heading"><h2>Do seu jeito</h2><p>Ajuste o visual e escolha onde as informações aparecem.</p></div>
        <OverlaySettingsPanel settings={settings} desktop={desktop} shortcutAvailable={state.shortcutAvailable} onChange={configure} />
        <OverlayPreview match={preview} settings={settings} />
      </>}
      {tab.id === 'demo' && <><div className="section-heading"><h2>Experimente o overlay</h2><p>Teste as informações e a posição antes de jogar.</p></div><DemoPanel runtime={runtime} state={state} desktop={desktop} perform={perform} /></>}
      {tab.id === 'updates' && <UpdatePanel desktop={desktop} busy={!!match || state.detection.config.enabled} autoUpdate={settings.autoUpdate} onAutoUpdateChange={autoUpdate => configure({ autoUpdate })} />}
    </section>)}
  </main>;
}
