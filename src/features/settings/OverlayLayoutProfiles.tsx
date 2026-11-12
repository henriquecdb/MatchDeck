import { useEffect, useRef, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import type { LayoutProfile, OverlaySettings } from '../../domain/settings';
import { useI18n } from '../../i18n/LanguageProvider';

export function OverlayLayoutProfiles({ runtime, gameId, settings }: { runtime: OverlayRuntime; gameId: string; settings: OverlaySettings }) {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<LayoutProfile[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void runtime.layoutProfiles(gameId, 'read').then(value => { if (!disposed) setProfiles(value); }).catch(cause => { if (!disposed) setError(String(cause)); }).finally(() => { if (!disposed) setBusy(false); });
    return () => { disposed = true; mounted.current = false; };
  }, [runtime, gameId]);
  const profile = profiles.find(p => p.id === selected);
  async function act(action: 'save' | 'delete' | 'apply') {
    setBusy(true); setError(null); setStatus('');
    try {
      if (action === 'apply') {
        if (!profile) return;
        await runtime.configure(profile.settings, gameId);
      } else {
        const next = await runtime.layoutProfiles(gameId, action, { id: profile?.id, name, settings });
        if (!mounted.current) return;
        setProfiles(next);
        if (action === 'delete') { setSelected(''); setName(''); }
        else { const saved = next.find(p => p.name === name.trim()); setSelected(saved?.id ?? ''); setName(saved?.name ?? ''); }
      }
      if (mounted.current) setStatus(action === 'apply' ? 'Perfil aplicado.' : action === 'save' ? 'Perfil salvo.' : 'Perfil excluído.');
    } catch (cause) { if (mounted.current) setError(String(cause)); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <details className="help-details"><summary>{t('Perfis de layout')}</summary>
    <label>{t('Perfil de layout')} <select disabled={busy} value={selected} onChange={event => { const id = event.target.value; setSelected(id); setName(profiles.find(p => p.id === id)?.name ?? ''); setStatus(''); }}>
      <option value="">{t('Novo perfil')}</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label>{t('Nome do perfil')} <input type="text" maxLength={32} value={name} disabled={busy} placeholder={t('Ex.: Compacto')} onChange={event => setName(event.target.value)} /></label>
    <div className="actions">
      <button disabled={busy || !name.trim()} onClick={() => void act('save')}>{t(profile ? 'Atualizar perfil' : 'Salvar perfil')}</button>
      <button disabled={busy || !profile} onClick={() => void act('apply')}>{t('Aplicar perfil')}</button>
      <button disabled={busy || !profile} onClick={() => void act('delete')}>{t('Excluir perfil')}</button>
    </div>
    {error && <p role="alert" className="error">{t(error)}</p>}
    {status && <p role="status">{t(status)}</p>}
  </details>;
}
