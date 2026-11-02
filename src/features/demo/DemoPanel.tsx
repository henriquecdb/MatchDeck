import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { modeLabels, replayMatch, type MatchMode } from '../../domain/match';
import { createDemoMatch } from '../../games/aoe2/demo';
import { OverlayPreview } from '../overlay/OverlayPreview';

interface Props {
  runtime: OverlayRuntime;
  state: AppState;
  desktop: boolean;
  perform(action: () => Promise<void>): Promise<void>;
}

export function DemoPanel({ runtime, state, desktop, perform }: Props) {
  const [mode, setMode] = useState<MatchMode>('ranked');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'synced' | 'fictional'>(state.lastSynced || state.detection.config.profile ? 'synced' : 'fictional');
  const { match, lastSynced, detection, settings } = state;

  function run(action: () => Promise<void>) {
    void perform(async () => {
      setBusy(true);
      try { await action(); } finally { setBusy(false); }
    });
  }

  return <>
    <fieldset disabled={detection.config.enabled || busy}>
      <legend>Testar sem entrar no jogo</legend>
      <label>Dados da demonstração <select disabled={!!match} value={source} onChange={event => setSource(event.target.value as typeof source)}>
        <option value="fictional">Jogadores fictícios</option><option value="synced">Última partida sincronizada</option>
      </select></label>
      {source === 'synced' && lastSynced && <p>Última partida: <strong>{lastSynced.map}</strong> · {lastSynced.players.map(player => player.name).join(' × ')}{lastSynced.syncedAt ? ` · ${new Date(lastSynced.syncedAt).toLocaleString('pt-BR')}` : ''}.</p>}
      {source === 'fictional' && <label>Modalidade fictícia <select disabled={!!match} value={mode} onChange={event => setMode(event.target.value as MatchMode)}>
          {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>}
      <div className="actions">
        <button disabled={!!match || (source === 'synced' && !lastSynced && (!desktop || !detection.config.profile))} onClick={() => run(async () => {
          if (source === 'fictional') { await runtime.start(createDemoMatch(mode)); return; }
          if (!lastSynced) await runtime.syncLatest();
          const latest = (await runtime.read()).lastSynced;
          if (!latest) throw new Error('Nenhuma partida sincronizada disponível. Selecione jogadores fictícios ou sincronize seu perfil.');
          await runtime.start(replayMatch(latest));
        })}>{busy ? 'Carregando…' : 'Iniciar demonstração'}</button>
        <button disabled={!match} onClick={() => run(() => runtime.finish())}>Encerrar demonstração</button>
        <button disabled={!!match || !desktop || !detection.config.profile} onClick={() => run(() => runtime.syncLatest())}>Atualizar últimos dados</button>
      </div>
    </fieldset>
    <p role="status">{detection.config.enabled ? 'Desative a detecção na aba Partida para iniciar um teste.' : match ? 'Demonstração em andamento. Você pode trocar de aba sem encerrar o overlay.' : 'Pronto para testar o overlay.'}</p>
    <p>{source === 'fictional' ? 'Jogadores fictícios não consultam a API nem substituem seus dados salvos.' : lastSynced ? 'O teste reutiliza os dados salvos, sem consultar a API.' : desktop && detection.config.profile ? 'O primeiro teste busca a última partida do seu perfil.' : 'Configure um perfil no aplicativo Windows e sincronize uma partida, ou selecione jogadores fictícios.'}</p>
    <OverlayPreview match={match} settings={settings} />
  </>;
}
