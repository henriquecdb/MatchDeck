import { useI18n } from '../../i18n/LanguageProvider';
import type { OverlaySettings } from '../../domain/settings';
import { anchorLabels, defaultSettings } from '../../domain/settings';
import type { DisplayMonitor } from '../../application/runtime';
import { defaultHotkeys, hotkeyLabel } from '../../domain/hotkeys';
import type { MatchSnapshot } from '../../domain/match';
import { isDuel } from '../../domain/teams';
import { resolveOverlayLayout } from '../../domain/overlay-layout';

interface Props {
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

export function OverlaySettingsPanel({ settings, match = null, desktop, shortcutAvailable, lockShortcut = defaultHotkeys.lockOverlay, onChange, monitors, onRefreshMonitors, monitorError }: Props) {
  const { t } = useI18n();
  const activeLayout = match ? resolveOverlayLayout(settings.layout, match) : settings.layout;
  return <fieldset>
    <legend>{t('Aparência e posição')}</legend>
    <label>{t('Modo de exibição')} <select value={activeLayout} onChange={event => onChange({ layout: event.target.value as OverlaySettings['layout'] })}>
      <option value="detailed" disabled={!!match && !isDuel(match)}>{t('Completo · apenas 1v1')}</option><option value="compact">{t('Compacto · faixa por equipes')}</option><option value="stacked">{t('Compacto vertical · jogadores empilhados')}</option>
    </select></label>
    <p>{t('O modo completo é exclusivo para 1v1. Nos demais formatos, essa preferência usa automaticamente o compacto vertical e volta ao completo no próximo 1v1.')}</p>
    <p>{t('O compacto horizontal mantém as equipes lado a lado. O vertical empilha os jogadores e usa metade da largura. Ambos usam emblemas das civilizações.')}</p>
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
    <p>{t('A posição se adapta à área útil do monitor. Ao arrastar, o posicionamento passa para manual. Janelas maiores que a tela permitem rolagem.')}</p>
    <label><input type="checkbox" checked={settings.focusOnly} onChange={event => onChange({ focusOnly: event.target.checked })} />  {t('Mostrar partidas reais somente com o Age 2 em primeiro plano')}</label>
    <p>{t('Desmarque para manter visível no Alt+Tab. A demonstração aparece mesmo fora do jogo.')}</p>
    <label><input type="checkbox" checked={settings.showProjection} onChange={event => onChange({ showProjection: event.target.checked })} />  {t('Exibir projeção não oficial de ganho/perda de rating')}</label>
    <p>{t('Controla os valores estimados com ~ durante a partida. O resultado real confirmado de uma partida concluída continua visível. Estimativas exigem uma fila 1v1 reconhecida e os ratings dos dois jogadores.')}</p>
    <label><input type="checkbox" checked={settings.showRating} onChange={event => onChange({ showRating: event.target.checked })} />  {t('Exibir rating')}</label>
    <label><input type="checkbox" checked={settings.showRecord} onChange={event => onChange({ showRecord: event.target.checked })} />  {t('Exibir vitórias e derrotas')}</label>
    <label><input type="checkbox" checked={settings.showWinRate} onChange={event => onChange({ showWinRate: event.target.checked })} />  {t('Exibir porcentagem de vitórias')}</label>
    <p>{t('No modo compacto, vitórias, derrotas e porcentagem aparecem nas dicas dos jogadores.')}</p>
    <label><input type="checkbox" checked={settings.highlightSelf} onChange={event => onChange({ highlightSelf: event.target.checked })} />  {t('Destacar meu jogador')}</label>
    <label><input type="checkbox" checked={settings.locked} onChange={event => onChange({ locked: event.target.checked })} />  {t('Travar overlay e passar cliques para o jogo')}</label>
    <p>{t('Destrave por este painel para arrastar o overlay.')} {desktop && (shortcutAvailable && lockShortcut ? t('{0} também alterna a trava.', { 0: hotkeyLabel(lockShortcut) }) : t('Atalho da trava indisponível ou desativado; use a opção acima.'))}</p>
    <button onClick={() => onChange({ x: defaultSettings.x, y: defaultSettings.y, opacity: defaultSettings.opacity, scale: 1, monitorId: null, anchor: 'manual', locked: false })}>{t('Restaurar posição, escala e opacidade')}</button>
  </fieldset>;
}
