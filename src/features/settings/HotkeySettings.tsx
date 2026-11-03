import { useEffect, useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { defaultHotkeys, hotkeyError, hotkeyKeys, hotkeyLabel, hotkeyModifiers, type Hotkeys } from '../../domain/hotkeys';
import { useI18n } from '../../i18n/LanguageProvider';

export function HotkeySettings({ state, runtime, desktop, perform }: { state: AppState; runtime: OverlayRuntime; desktop: boolean; perform(action: () => Promise<void>): Promise<void> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(state.preferences.hotkeys);
  const [busy, setBusy] = useState(false);
  const { lockOverlay, toggleOverlay } = state.preferences.hotkeys;
  useEffect(() => setDraft({ lockOverlay, toggleOverlay }), [lockOverlay, toggleOverlay]);
  const error = hotkeyError(draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(state.preferences.hotkeys);
  const actions: Array<{ key: keyof Hotkeys; label: string; available: boolean }> = [
    { key: 'lockOverlay', label: 'Travar/destravar overlay', available: state.shortcutAvailable },
    { key: 'toggleOverlay', label: 'Mostrar/ocultar overlay', available: state.visibilityShortcutAvailable },
  ];
  return <fieldset disabled={busy}><legend>{t('Atalhos globais')}</legend>
    <p>{t('Escolha os modificadores e a tecla de cada ação. Os atalhos funcionam mesmo durante a partida.')}</p>
    {actions.map(action => {
      const value = draft[action.key];
      const parts = value?.split('+') ?? [];
      const key = parts.pop() ?? 'O';
      const update = (modifiers: string[], selectedKey: string) => setDraft(previous => ({ ...previous, [action.key]: [...modifiers, selectedKey].join('+') }));
      return <div className="hotkey-row" key={action.key} role="group" aria-label={t(action.label)}>
        <strong>{t(action.label)}</strong> <kbd>{t(hotkeyLabel(value))}</kbd>
        <label><input type="checkbox" checked={value !== null} onChange={event => setDraft(previous => ({ ...previous, [action.key]: event.target.checked ? defaultHotkeys[action.key] : null }))} /> {t('Ativado')}</label>
        <div className="actions">{hotkeyModifiers.map(modifier => <label key={modifier}><input type="checkbox" disabled={value === null} checked={parts.includes(modifier)} onChange={event => update(hotkeyModifiers.filter(item => item === modifier ? event.target.checked : parts.includes(item)), key)} /> {modifier === 'Super' ? 'Win' : modifier}</label>)}
          <label>{t('Tecla')} <select disabled={value === null} value={key} onChange={event => update(parts, event.target.value)}>{hotkeyKeys.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <small>{t('Registro atual:')} {t(!state.preferences.hotkeys[action.key] ? 'Desativado' : desktop ? action.available ? 'Disponível' : 'Indisponível; escolha outra combinação.' : 'Disponível no aplicativo Windows.')}</small>
      </div>;
    })}
    {error && <p role="alert" className="error">{t(error)}</p>}
    <div className="actions"><button disabled={!!error || !changed} onClick={() => void perform(async () => { setBusy(true); try { await runtime.configureApp({ ...state.preferences, hotkeys: draft }); } finally { setBusy(false); } })}>{t('Salvar atalhos')}</button>
      <button onClick={() => setDraft({ ...defaultHotkeys })}>{t('Restaurar atalhos padrão')}</button>
      <button disabled={!changed} onClick={() => setDraft(state.preferences.hotkeys)}>{t('Descartar alterações')}</button>
    </div>
    <p>{t('Se uma combinação estiver em uso por outro aplicativo, os atalhos anteriores serão preservados.')}</p>
  </fieldset>;
}
