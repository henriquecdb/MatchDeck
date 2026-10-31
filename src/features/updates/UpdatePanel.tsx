import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import metadata from '../../../package.json';
import { UpdateManager } from '../../application/update-manager';
import { NativeUpdater } from '../../infrastructure/native-updater';
import { progressPercent } from '../../domain/updates';

interface Props {
  desktop: boolean;
  busy: boolean;
  autoUpdate: boolean;
  onAutoUpdateChange(value: boolean): void;
}

export function UpdatePanel(props: Props) {
  return props.desktop ? <DesktopUpdates {...props} /> : <fieldset><legend>Atualizações</legend><p>MatchDeck {metadata.version} · Atualizações disponíveis no aplicativo Windows.</p></fieldset>;
}

function DesktopUpdates({ busy, autoUpdate, onAutoUpdateChange }: Props) {
  const blocked = useRef(busy);
  blocked.current = busy;
  const manager = useMemo(() => new UpdateManager(new NativeUpdater(() => !blocked.current)), []);
  const state = useSyncExternalStore(manager.subscribe, manager.snapshot);
  const [previousVersion] = useState(() => localStorage.getItem('matchdeck.previousVersion'));
  const installing = ['downloading', 'installing', 'restarting'].includes(state.phase);
  const percent = progressPercent(state.downloaded, state.total);

  useEffect(() => {
    if (previousVersion && previousVersion !== metadata.version) localStorage.removeItem('matchdeck.previousVersion');
    if (import.meta.env.DEV) return;
    void manager.check();
    const timer = setInterval(() => void manager.check(), 4 * 60 * 60 * 1000);
    return () => { clearInterval(timer); void manager.dispose().catch(console.error); };
  }, [manager, previousVersion]);

  useEffect(() => {
    if (autoUpdate && !busy && state.phase === 'available' && !import.meta.env.DEV) void manager.install();
  }, [autoUpdate, busy, manager, state.phase]);

  return <>
    <fieldset disabled={installing}>
      <legend>Atualizações · versão {metadata.version}</legend>
      {previousVersion && previousVersion !== metadata.version && <p role="status">Atualizado de {previousVersion} para {metadata.version}.</p>}
      <label><input type="checkbox" checked={autoUpdate} onChange={event => onAutoUpdateChange(event.target.checked)} /> Instalar automaticamente com a detecção desativada</label>
      <p>A versão instalada verifica novidades ao abrir e a cada quatro horas. Nenhuma instalação começa com uma partida ou detecção ativa.</p>
      {import.meta.env.DEV && <p>Na versão de desenvolvimento, a instalação automática fica desativada.</p>}
      <div className="actions">
        <button disabled={state.phase === 'checking'} onClick={() => void manager.check()}>{state.phase === 'checking' ? 'Verificando…' : 'Verificar atualizações'}</button>
        {state.available && <button disabled={busy || import.meta.env.DEV || state.phase === 'checking'} onClick={() => void manager.install()}>Instalar versão {state.available.version}</button>}
      </div>
      {state.phase === 'current' && <p role="status">Você está na versão mais recente.</p>}
      {state.available && <><p>Versão {state.available.currentVersion} → {state.available.version}</p><details open><summary>O que mudou</summary><pre className="release-notes">{state.available.notes || 'Consulte as notas do release no GitHub.'}</pre></details></>}
      {state.available && busy && <p>Encerre o teste e desative a detecção para instalar.</p>}
      {state.error && <p className="error" role="alert">Não foi possível concluir a atualização: {state.error}</p>}
    </fieldset>
    {installing && <div className="update-backdrop"><section className="update-dialog" role="dialog" aria-modal="true" aria-label="Atualizando MatchDeck">
      <h2>Atualizando MatchDeck</h2><p>{state.available?.currentVersion} → {state.available?.version}</p>
      <p role="status">{state.phase === 'downloading' ? 'Baixando e verificando a atualização…' : 'Instalando a atualização. O aplicativo será reiniciado…'}</p>
      <progress max="100" value={state.phase === 'downloading' ? percent : undefined} />
      {state.phase === 'downloading' && <p>{percent === undefined ? `${(state.downloaded / 1048576).toFixed(1)} MB baixados` : `${percent}%`}</p>}
      <p>A instalação continuará na janela de progresso do Windows.</p>
    </section></div>}
  </>;
}
