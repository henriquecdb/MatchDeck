import { useI18n } from '../../i18n/LanguageProvider';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import metadata from '../../../package.json';
import { UpdateManager } from '../../application/update-manager';
import { NativeUpdater } from '../../infrastructure/native-updater';
import { progressPercent } from '../../domain/updates';
import changelog from '../../../CHANGELOG.md?raw';
import englishChangelog from '../../../CHANGELOG.en.md?raw';
import { releaseSection } from '../../domain/changelog';

const ReleaseNotes = lazy(() => import('./ReleaseNotes').then(module => ({ default: module.ReleaseNotes })));
const installedNotes = releaseSection(changelog, metadata.version);
const installedEnglishNotes = releaseSection(englishChangelog, metadata.version);

interface Props {
  desktop: boolean;
  busy: boolean;
  autoUpdate: boolean;
  onAutoUpdateChange(value: boolean): void;
  visible?: boolean;
}

export function UpdatePanel(props: Props) {
  const { t, language } = useI18n();
  return props.desktop ? <DesktopUpdates {...props} /> : <fieldset><legend>{t('Atualizações')}</legend><p>MatchDeck {metadata.version}  {t('· Atualizações disponíveis no aplicativo Windows.')}</p>
    {props.visible !== false && <Suspense fallback={<p role="status">{t('Carregando notas da versão…')}</p>}><ReleaseNotes notes={language === 'en' ? installedEnglishNotes : installedNotes} version={metadata.version} title={t('Novidades desta versão')} /></Suspense>}
  </fieldset>;
}

function DesktopUpdates({ busy, autoUpdate, onAutoUpdateChange, visible = true }: Props) {
  const { t, language } = useI18n();
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
      <legend>{t('Atualizações · versão')} {metadata.version}</legend>
      {previousVersion && previousVersion !== metadata.version && <p role="status">{t('Atualizado de')} {previousVersion}  {t('para')} {metadata.version}.</p>}
      <label><input type="checkbox" checked={autoUpdate} onChange={event => onAutoUpdateChange(event.target.checked)} />  {t('Instalar automaticamente com a detecção desativada')}</label>
      <p>{t('Verifica ao abrir e a cada 4 h. Instala só sem partida e com a detecção desativada.')}</p>
      {import.meta.env.DEV && <p>{t('Na versão de desenvolvimento, a instalação automática fica desativada.')}</p>}
      <div className="actions">
        <button disabled={state.phase === 'checking'} onClick={() => void manager.check()}>{state.phase === 'checking' ? t('Verificando…') : t('Verificar atualizações')}</button>
        {state.available && <button disabled={busy || import.meta.env.DEV || state.phase === 'checking'} onClick={() => void manager.install()}>{t('Instalar versão')} {state.available.version}</button>}
      </div>
      {state.phase === 'current' && <p role="status">{t('App atualizado.')}</p>}
      {state.available && <p>{t('Versão')} {state.available.currentVersion} → {state.available.version}</p>}
      {visible && <Suspense fallback={<p role="status">{t('Carregando notas da versão…')}</p>}><ReleaseNotes
        notes={state.available?.notes ?? (language === 'en' ? installedEnglishNotes : installedNotes)} version={state.available?.version ?? metadata.version}
        title={state.available ? t('O que mudou') : t('Novidades desta versão')} /></Suspense>}
      {state.available && busy && <p>{t('Encerre o teste e desative a detecção para instalar.')}</p>}
      {state.error && <p className="error" role="alert">{t('Não foi possível concluir a atualização:')} {t(state.error)}</p>}
    </fieldset>
    {installing && createPortal(<div className="update-backdrop"><section className="update-dialog" role="dialog" aria-modal="true" aria-label={t('Atualizando MatchDeck')}>
      <h2>{t('Atualizando MatchDeck')}</h2><p>{state.available?.currentVersion} → {state.available?.version}</p>
      <p role="status">{state.phase === 'downloading' ? t('Baixando e verificando a atualização…') : t('Instalando a atualização. O aplicativo será reiniciado…')}</p>
      <progress max="100" value={state.phase === 'downloading' ? percent : undefined} />
      {state.phase === 'downloading' && <p>{percent === undefined ? t('{0} MB baixados', { 0: (state.downloaded / 1048576).toFixed(1) }) : `${percent}%`}</p>}
      <p>{t('A instalação continuará na janela de progresso do Windows.')}</p>
    </section></div>, document.body)}
  </>;
}
