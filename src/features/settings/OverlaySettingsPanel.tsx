import { OverlayLayoutProfiles } from './OverlayLayoutProfiles';
import { useI18n } from '../../i18n/LanguageProvider';
import type { OverlaySettings } from '../../domain/settings';
import { anchorLabels, defaultSettings } from '../../domain/settings';
import type { OverlayRuntime, DisplayMonitor } from '../../application/runtime';
import { defaultHotkeys, hotkeyLabel } from '../../domain/hotkeys';
import type { MatchSnapshot } from '../../domain/match';
import { isDuel } from '../../domain/teams';
import { resolveOverlayLayout } from '../../domain/overlay-layout';

interface Props {
  runtime: OverlayRuntime;
  gameId?: string;
  settings: OverlaySettings;
  match?: MatchSnapshot | null;
  desktop: boolean;
  shortcutAvailable: boolean;
  lockShortcut?: string | null;
  onChange(patch: Partial<OverlaySettings>): void;
  monitors: DisplayMonitor[];
  onRefreshMonitors(): void;
  monitorError: string | null;
}

export function OverlaySettingsPanel({ runtime, gameId = 'aoe2-de', settings, match = null, desktop, shortcutAvailable, lockShortcut = defaultHotkeys.lockOverlay, onChange, monitors, onRefreshMonitors, monitorError }: Props) {
  const { t } = useI18n();
  const activeLayout = match ? resolveOverlayLayout(settings.layout, match) : settings.layout;
  return <fieldset>
    <legend>{t('Aparência e posição')}</legend>
    <OverlayLayoutProfiles key={gameId} runtime={runtime} gameId={gameId} settings={settings} />
    {gameId === 'sc2' ? <p>{t('SC2 · compacto 1v1')}</p> : gameId === 'aoe4' ? <label>{t('Modo de exibição')} <select value={settings.layout === 'stacked' ? 'stacked' : 'compact'} onChange={event => onChange({ layout: event.target.value as OverlaySettings['layout'] })}><option value="compact">{t('Compacto horizontal')}</option><option value="stacked">{t('Compacto vertical')}</option></select></label> : <><label>{t('Modo de exibição')} <select value={activeLayout} onChange={event => onChange({ layout: event.target.value as OverlaySettings['layout'] })}>
      <option value="detailed" disabled={!!match && !isDuel(match)}>{t('Completo · apenas 1v1')}</option><option value="compact">{t('Compacto horizontal')}</option><option value="stacked">{t('Compacto vertical')}</option>
    </select></label>
    <details className="help-details"><summary>{t('Sobre os layouts')}</summary><p>{t('Completo só em 1v1. Nos demais formatos, usa o vertical e retorna no próximo duelo.')}</p>
    <p>{t('Horizontal: equipes lado a lado. Vertical: jogadores empilhados, com metade da largura. Ambos usam emblemas.')}</p></details></>}
    <label>{t('Opacidade:')} {Math.round(settings.opacity * 100)}%
      <input type="range" min="0.2" max="1" step="0.05" value={settings.opacity} onChange={event => onChange({ opacity: Number(event.target.value) })} />
    </label>
    <label>{t('Escala:')} {Math.round(settings.scale * 100)}%
      <input type="range" min="0.5" max="1.5" step="0.05" value={settings.scale} onChange={event => onChange({ scale: Number(event.target.value) })} />
    </label>
    <label>Monitor <select disabled={!desktop} value={settings.monitorId ?? ''} onChange={event => onChange({ monitorId: event.target.value || null })}>
      <option value="">{t('Automático · posição atual ou monitor principal')}</option>
      {settings.monitorId && !monitors.some(monitor => monitor.id === settings.monitorId) && <option value={settings.monitorId}>{t('Monitor desconectado · usando o principal')}</option>}
      {monitors.map(monitor => <option key={monitor.id} value={monitor.id}>{monitor.name} · {Math.round(monitor.scaleFactor * 100)}%</option>)}
    </select></label>
    <button disabled={!desktop} onClick={onRefreshMonitors}>{t('Atualizar monitores')}</button>
    {monitorError && <p role="alert" className="error">{t(monitorError)}</p>}
    <label>{t('Posição pronta')} <select value={settings.anchor} onChange={event => onChange({ anchor: event.target.value as OverlaySettings['anchor'] })}>
      {Object.entries(anchorLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
    </select></label>
    <label>{t('Margem nas bordas')} <input type="number" min="0" max="200" disabled={settings.anchor === 'manual'} value={settings.margin} onChange={event => onChange({ margin: Number(event.target.value) })} /> px</label>
    <div className="coordinates">
      <label>{t('Posição X')} <input type="number" min="-32000" max="32000" disabled={settings.anchor !== 'manual'} value={settings.x} onChange={event => onChange({ x: Number(event.target.value) })} /></label>
      <label>{t('Posição Y')} <input type="number" min="-32000" max="32000" disabled={settings.anchor !== 'manual'} value={settings.y} onChange={event => onChange({ y: Number(event.target.value) })} /></label>
    </div>
    <p>{t('A posição se ajusta ao monitor. Arrastar ativa o modo manual. Conteúdo maior que a tela permite rolagem.')}</p>
    <label><input type="checkbox" checked={settings.focusOnly} onChange={event => onChange({ focusOnly: event.target.checked })} />  {t(gameId === 'sc2' ? 'Mostrar partidas reais somente com o SC2 em primeiro plano' : gameId === 'aoe4' ? 'Mostrar partidas reais somente com o Age 4 em primeiro plano' : 'Mostrar partidas reais somente com o Age 2 em primeiro plano')}</label>
    <p>{t('Desmarque para exibir no Alt+Tab. Demonstrações aparecem fora do jogo.')}</p>
    {gameId === 'aoe2-de' && <><label><input type="checkbox" checked={settings.showProjection} onChange={event => onChange({ showProjection: event.target.checked })} />  {t('Exibir projeção não oficial de ganho/perda de rating')}</label>
    <p>{t('~ indica estimativa: exige fila 1v1 compatível e ambos os ratings. Resultados confirmados continuam visíveis.')}</p></>}
    <label><input type="checkbox" checked={settings.showRating} onChange={event => onChange({ showRating: event.target.checked })} />  {t('Exibir rating')}</label>
    <label><input type="checkbox" checked={settings.showRecord} onChange={event => onChange({ showRecord: event.target.checked })} />  {t('Exibir vitórias e derrotas')}</label>
    <label><input type="checkbox" checked={settings.showWinRate} onChange={event => onChange({ showWinRate: event.target.checked })} />  {t('Exibir porcentagem de vitórias')}</label>
    {gameId === 'sc2' && <label>{t('Pós-partida (s) · 0 desativa')} <input type="number" min={0} max={30} value={settings.postGameSeconds} onChange={event => onChange({ postGameSeconds: Math.max(0, Math.min(30, Number(event.target.value))) })} /></label>}
    {gameId === 'sc2' && <label><input type="checkbox" checked={settings.showSession} onChange={event => onChange({ showSession: event.target.checked })} /> {t('Mostrar sessão no overlay')}</label>}
    {gameId === 'aoe2-de' && <p>{t('No compacto, passe o mouse no jogador para ver vitórias, derrotas e aproveitamento.')}</p>}
    <label><input type="checkbox" checked={settings.highlightSelf} onChange={event => onChange({ highlightSelf: event.target.checked })} />  {t('Destacar meu jogador')}</label>
    <label><input type="checkbox" checked={settings.locked} onChange={event => onChange({ locked: event.target.checked })} />  {t('Travar overlay e passar cliques para o jogo')}</label>
    <p>{t('Destrave para arrastar.')} {desktop && (shortcutAvailable && lockShortcut ? t('{0} também alterna a trava.', { 0: hotkeyLabel(lockShortcut) }) : t('Atalho da trava indisponível ou desativado; use a opção acima.'))}</p>
    <button onClick={() => onChange({ x: defaultSettings.x, y: defaultSettings.y, opacity: defaultSettings.opacity, scale: 1, monitorId: null, anchor: 'manual', locked: false })}>{t('Restaurar posição, escala e opacidade')}</button>
  </fieldset>;
}
