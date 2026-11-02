import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { modeLabels, type MatchMode } from '../../domain/match';
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
      {lastSynced ? <p>Última partida: <strong>{lastSynced.map}</strong> · {lastSynced.players.map(player => player.name).join(' × ')}{lastSynced.syncedAt ? ` · ${new Date(lastSynced.syncedAt).toLocaleString('pt-BR')}` : ''}.</p>
        : <label>Modalidade fictícia <select value={mode} onChange={event => setMode(event.target.value as MatchMode)}>
          {Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>}
      <div className="actions">
        <button disabled={!!match} onClick={() => run(async () => {
          if (!lastSynced && desktop && detection.config.profile) await runtime.syncLatest();
          await runtime.start(createDemoMatch(mode));
        })}>{busy ? 'Carregando…' : 'Iniciar demonstração'}</button>
        <button disabled={!match} onClick={() => run(() => runtime.finish())}>Encerrar demonstração</button>
        <button disabled={!!match || !desktop || !detection.config.profile} onClick={() => run(() => runtime.syncLatest())}>Atualizar últimos dados</button>
      </div>
    </fieldset>
    <p role="status">{detection.config.enabled ? 'Desative a detecção na aba Partida para iniciar um teste.' : match ? 'Demonstração em andamento. Você pode trocar de aba sem encerrar o overlay.' : 'Pronto para testar o overlay.'}</p>
    <p>{lastSynced ? 'O teste reutiliza os dados salvos, sem consultar a API.' : desktop && detection.config.profile ? 'O primeiro teste busca a última partida do seu perfil.' : 'Sem dados sincronizados: o teste usa jogadores fictícios.'}</p>
    <OverlayPreview match={match} settings={settings} />
  </>;
}
