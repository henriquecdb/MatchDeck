import { useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import { useRuntime } from '../../application/use-runtime';
import { modeLabels, type MatchMode } from '../../domain/match';
import { defaultSettings } from '../../domain/settings';
import { createDemoMatch } from '../../games/aoe2/demo';
import { MatchOverlay } from '../overlay/MatchOverlay';
import { DetectionPanel } from '../detection/DetectionPanel';
import { UpdatePanel } from '../updates/UpdatePanel';
import metadata from '../../../package.json';

export function ControlPanel({ runtime, desktop }: { runtime: OverlayRuntime; desktop: boolean }) {
  const { state, ready, error, perform } = useRuntime(runtime);
  const [mode, setMode] = useState<MatchMode>('ranked');
  const [demoBusy, setDemoBusy] = useState(false);
  const { settings, match } = state;
  const configure = (patch: Partial<typeof settings>) => void perform(() => runtime.configure({ ...settings, ...patch }));

  return <main>
    <h1>MatchDeck</h1>
    <p>Overlay para jogos · versão {metadata.version}</p>
    <p className="notice">{desktop ? 'Modo Windows: o overlay abre em uma janela separada.' : 'Modo navegador: a prévia abaixo não aparece sobre outros aplicativos.'}</p>
    {error && <p role="alert" className="error">{error}</p>}
    <DetectionPanel runtime={runtime} status={state.detection} desktop={desktop} ready={ready} />
    <fieldset disabled={!ready || state.detection.config.enabled || demoBusy}>
      <legend>Partida de demonstração · Age of Empires II: DE</legend>
      {state.lastSynced ? <p>A demonstração usará a última partida sincronizada: <strong>{state.lastSynced.map}</strong> · {state.lastSynced.players.map(player => player.name).join(' × ')}{state.lastSynced.syncedAt ? ` · ${new Date(state.lastSynced.syncedAt).toLocaleString('pt-BR')}` : ''}.</p> : <label>Modalidade fictícia <select value={mode} onChange={event => setMode(event.target.value as MatchMode)}>
        {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
      <div className="actions">
        <button disabled={!!match} onClick={() => void perform(async () => {
          setDemoBusy(true);
          try {
            if (!state.lastSynced && desktop && state.detection.config.profile) await runtime.syncLatest();
            await runtime.start(createDemoMatch(mode));
          } finally { setDemoBusy(false); }
        })}>{demoBusy ? 'Carregando…' : 'Iniciar demonstração'}</button>
        <button disabled={!match} onClick={() => void perform(() => runtime.finish())}>Encerrar partida</button>
        <button disabled={!!match || !desktop || !state.detection.config.profile} onClick={() => void perform(async () => {
          setDemoBusy(true);
          try { await runtime.syncLatest(); } finally { setDemoBusy(false); }
        })}>Atualizar últimos dados</button>
      </div>
      <p role="status">{match ? `Em partida · ${modeLabels[match.mode]} · dados fixos até encerrar` : 'Aguardando partida'}</p>
      <p>{state.lastSynced ? 'Os dados salvos são reutilizados sem consultar a API ao iniciar o teste.' : desktop && state.detection.config.profile ? 'No primeiro teste, buscaremos sua última partida para criar a cópia local.' : 'Sem dados sincronizados: o teste usará jogadores fictícios.'} Desative a detecção real para usar a demonstração.</p>
    </fieldset>
    <fieldset disabled={!ready}>
      <legend>Overlay</legend>
      <label>Modo de exibição <select value={settings.layout} onChange={event => configure({ layout: event.target.value as typeof settings.layout })}>
        <option value="detailed">Completo</option><option value="compact">Compacto</option>
      </select></label>
      <label>Opacidade: {Math.round(settings.opacity * 100)}%
        <input type="range" min="0.2" max="1" step="0.05" value={settings.opacity} onChange={event => configure({ opacity: Number(event.target.value) })} />
      </label>
      <div className="coordinates">
        <label>Posição X <input type="number" min="-32000" max="32000" value={settings.x} onChange={event => configure({ x: Number(event.target.value) })} /></label>
        <label>Posição Y <input type="number" min="-32000" max="32000" value={settings.y} onChange={event => configure({ y: Number(event.target.value) })} /></label>
      </div>
      <label><input type="checkbox" checked={settings.locked} onChange={event => configure({ locked: event.target.checked })} /> Travar overlay e passar cliques para o jogo</label>
      <p>Destrave por este painel para arrastar o overlay. {desktop && (state.shortcutAvailable ? 'Ctrl+Shift+O também alterna a trava.' : 'Ctrl+Shift+O está indisponível; use a opção acima.')}</p>
      <button onClick={() => void perform(() => runtime.configure({ ...defaultSettings }))}>Restaurar posição e opacidade</button>
    </fieldset>
    <h2>Prévia</h2>
    {match?.warnings?.map(warning => <p role="status" key={warning}>{warning}</p>)}
    <p>As bordas e os números usam a cor de cada jogador na partida. Estatísticas ausentes aparecem como “—”.</p>
    <div className="preview">{match ? <div style={{ opacity: settings.opacity }}><MatchOverlay match={match} layout={settings.layout} /></div> : <p>Ative a detecção ou inicie uma partida de demonstração.</p>}</div>
    <UpdatePanel desktop={desktop} busy={!!match || state.detection.config.enabled} autoUpdate={settings.autoUpdate} onAutoUpdateChange={autoUpdate => configure({ autoUpdate })} />
  </main>;
}
