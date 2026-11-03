import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { LoadingScreen } from '../shell/LoadingScreen';
import { Modal } from '../shell/Modal';

export function GeneralSettings({ state, runtime, desktop, perform }: { state: AppState; runtime: OverlayRuntime; desktop: boolean; perform(action: () => Promise<void>): Promise<void> }) {
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const preferences = state.preferences;
  function configure(patch: Partial<typeof preferences>) {
    void perform(async () => { setBusy(true); try { await runtime.configureApp({ ...preferences, ...patch }); } finally { setBusy(false); } });
  }
  return <>
    <fieldset disabled={busy}><legend>Aplicativo e Windows</legend>
      <label><input type="checkbox" disabled={!desktop} checked={state.autostart} onChange={event => {
        const enabled = event.target.checked;
        void perform(async () => { setBusy(true); try { await runtime.setAutostart(enabled); } finally { setBusy(false); } });
      }} /> Iniciar com o Windows</label>
      <label><input type="checkbox" disabled={!desktop || !state.trayAvailable} checked={preferences.launchMinimized} onChange={event => configure({ launchMinimized: event.target.checked })} /> Abrir minimizado na bandeja</label>
      <label>Ao fechar a janela <select disabled={!desktop} value={preferences.closeAction} onChange={event => configure({ closeAction: event.target.value as typeof preferences.closeAction })}>
        <option value="ask">Perguntar o que fazer</option><option value="minimize" disabled={!state.trayAvailable}>Continuar na bandeja</option><option value="exit">Encerrar o aplicativo</option>
      </select></label>
      <p>{state.trayAvailable ? 'Use o ícone da bandeja para reabrir o painel, controlar a detecção ou sair.' : 'A bandeja está indisponível nesta execução; a janela continuará acessível.'}</p>
      <button disabled={!desktop || !state.trayAvailable} onClick={() => void perform(() => runtime.closeApp('minimize'))}>Minimizar para a bandeja</button>
    </fieldset>
    <fieldset><legend>Carregamento e configuração inicial</legend>
      <p>{state.startupMs == null ? 'O tempo de abertura será informado ao concluir a inicialização.' : `Interface pronta em ${state.startupMs} ms nesta execução.`} A tela de carregamento pode aparecer brevemente quando a abertura é rápida.</p>
      <div className="actions"><button onClick={() => setPreview(true)}>Visualizar tela de carregamento</button><button onClick={() => configure({ onboardingComplete: false })}>Reabrir configuração guiada</button></div>
    </fieldset>
    {preview && <Modal title="Prévia do carregamento" onClose={() => setPreview(false)}><LoadingScreen /><button onClick={() => setPreview(false)}>Fechar prévia</button></Modal>}
  </>;
}
