import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { Modal } from '../shell/Modal';

export function CloseDialog({ state, runtime, perform }: { state: AppState; runtime: OverlayRuntime; perform(action: () => Promise<void>): Promise<void> }) {
  const { t } = useI18n();
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancel = () => void perform(() => runtime.closeApp('cancel'));
  const close = (action: 'minimize' | 'exit') => void perform(async () => {
    setBusy(true);
    try { if (remember) await runtime.configureApp({ ...state.preferences, closeAction: action }); await runtime.closeApp(action); }
    finally { setBusy(false); }
  });
  return <Modal title={t('Fechar o MatchDeck')} onClose={() => { if (!busy) cancel(); }}>
    <p>{t('Continuar na bandeja mantém a detecção e o overlay funcionando. Encerrar fecha todo o aplicativo.')}</p>
    <label><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} disabled={busy} />  {t('Lembrar minha escolha')}</label>
    <div className="actions"><button disabled={busy || !state.trayAvailable} onClick={() => close('minimize')}>{t('Continuar na bandeja')}</button><button disabled={busy} onClick={() => close('exit')}>{t('Encerrar MatchDeck')}</button><button disabled={busy} onClick={cancel}>{t('Cancelar')}</button></div>
  </Modal>;
}
