import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { LoadingScreen } from '../shell/LoadingScreen';
import { Modal } from '../shell/Modal';
import { HotkeySettings } from './HotkeySettings';

export function GeneralSettings({ state, runtime, desktop, perform }: { state: AppState; runtime: OverlayRuntime; desktop: boolean; perform(action: () => Promise<void>): Promise<void> }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const preferences = state.preferences;
  function configure(patch: Partial<typeof preferences>) {
    void perform(async () => { setBusy(true); try { await runtime.configureApp({ ...preferences, ...patch }); } finally { setBusy(false); } });
  }
  return <>
    <HotkeySettings state={state} runtime={runtime} desktop={desktop} perform={perform} />
    <fieldset disabled={busy}><legend>{t('Idioma')}</legend>
      <label>{t('Idioma da interface')} <select value={preferences.language} onChange={event => configure({ language: event.target.value as typeof preferences.language })}>
        <option value="pt-BR">Português (Brasil)</option><option value="en">English</option>
      </select></label>
      <label>{t('Civilizações e unidades')} <select value={preferences.gameLanguage} onChange={event => configure({ gameLanguage: event.target.value as typeof preferences.gameLanguage })}>
        <option value="en">English</option><option value="pt-BR">Português (Brasil)</option>
      </select></label>
      <p>{t('Padrão: inglês, independente do idioma da interface.')}</p>
    </fieldset>
    <fieldset disabled={busy}><legend>{t('Aplicativo e Windows')}</legend>
      <label><input type="checkbox" checked={preferences.openLastGame} onChange={event => configure({ openLastGame: event.target.checked })} /> {t('Abrir no último jogo usado')}</label>
      <label><input type="checkbox" disabled={!desktop} checked={state.autostart} onChange={event => {
        const enabled = event.target.checked;
        void perform(async () => { setBusy(true); try { await runtime.setAutostart(enabled); } finally { setBusy(false); } });
      }} />  {t('Iniciar com o Windows')}</label>
      <label><input type="checkbox" disabled={!desktop || !state.trayAvailable} checked={preferences.launchMinimized} onChange={event => configure({ launchMinimized: event.target.checked })} />  {t('Abrir minimizado na bandeja')}</label>
      <label>{t('Ao fechar a janela')} <select disabled={!desktop} value={preferences.closeAction} onChange={event => configure({ closeAction: event.target.value as typeof preferences.closeAction })}>
        <option value="ask">{t('Perguntar o que fazer')}</option><option value="minimize" disabled={!state.trayAvailable}>{t('Continuar na bandeja')}</option><option value="exit">{t('Encerrar o aplicativo')}</option>
      </select></label>
      <p>{state.trayAvailable ? t('Na bandeja: abrir painel, controlar detecção ou sair.') : t('Bandeja indisponível; use a janela do app.')}</p>
      <button disabled={!desktop || !state.trayAvailable} onClick={() => void perform(() => runtime.closeApp('minimize'))}>{t('Minimizar para a bandeja')}</button>
    </fieldset>
    <fieldset><legend>{t('Carregamento e configuração inicial')}</legend>
      <p>{state.startupMs == null ? t('O tempo de abertura será informado ao concluir a inicialização.') : t('Interface pronta em {0} ms.', { 0: state.startupMs })}  {t('A abertura rápida pode tornar o carregamento imperceptível.')}</p>
      <div className="actions"><button onClick={() => setPreview(true)}>{t('Visualizar tela de carregamento')}</button><button onClick={() => configure({ onboardingComplete: false })}>{t('Reabrir configuração guiada')}</button></div>
    </fieldset>
    {preview && <Modal title={t('Prévia do carregamento')} onClose={() => setPreview(false)}><LoadingScreen /><button onClick={() => setPreview(false)}>{t('Fechar prévia')}</button></Modal>}
  </>;
}
