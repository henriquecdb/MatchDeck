import type { OverlaySettings } from '../../domain/settings';
import { anchorLabels, defaultSettings } from '../../domain/settings';
import type { DisplayMonitor } from '../../application/runtime';

interface Props {
  settings: OverlaySettings;
  desktop: boolean;
  shortcutAvailable: boolean;
  onChange(patch: Partial<OverlaySettings>): void;
  monitors: DisplayMonitor[];
  onRefreshMonitors(): void;
  monitorError: string | null;
}

export function OverlaySettingsPanel({ settings, desktop, shortcutAvailable, onChange, monitors, onRefreshMonitors, monitorError }: Props) {
  return <fieldset>
    <legend>Aparência e posição</legend>
    <label>Modo de exibição <select value={settings.layout} onChange={event => onChange({ layout: event.target.value as OverlaySettings['layout'] })}>
      <option value="detailed">Completo · cards com unidades</option><option value="compact">Compacto · faixa por equipes</option>
    </select></label>
    <p>O compacto organiza os jogadores em linhas, com os emblemas das civilizações. O completo mantém as unidades e as estatísticas detalhadas.</p>
    <label>Opacidade: {Math.round(settings.opacity * 100)}%
      <input type="range" min="0.2" max="1" step="0.05" value={settings.opacity} onChange={event => onChange({ opacity: Number(event.target.value) })} />
    </label>
    <label>Escala: {Math.round(settings.scale * 100)}%
      <input type="range" min="0.5" max="1.5" step="0.05" value={settings.scale} onChange={event => onChange({ scale: Number(event.target.value) })} />
    </label>
    <label>Monitor <select disabled={!desktop} value={settings.monitorId ?? ''} onChange={event => onChange({ monitorId: event.target.value || null })}>
      <option value="">Automático · posição atual ou monitor principal</option>
      {settings.monitorId && !monitors.some(monitor => monitor.id === settings.monitorId) && <option value={settings.monitorId}>Monitor desconectado · usando o principal</option>}
      {monitors.map(monitor => <option key={monitor.id} value={monitor.id}>{monitor.name} · {Math.round(monitor.scaleFactor * 100)}%</option>)}
    </select></label>
    <button disabled={!desktop} onClick={onRefreshMonitors}>Atualizar monitores</button>
    {monitorError && <p role="alert" className="error">{monitorError}</p>}
    <label>Posição pronta <select value={settings.anchor} onChange={event => onChange({ anchor: event.target.value as OverlaySettings['anchor'] })}>
      {Object.entries(anchorLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>Margem nas bordas <input type="number" min="0" max="200" disabled={settings.anchor === 'manual'} value={settings.margin} onChange={event => onChange({ margin: Number(event.target.value) })} /> px</label>
    <div className="coordinates">
      <label>Posição X <input type="number" min="-32000" max="32000" disabled={settings.anchor !== 'manual'} value={settings.x} onChange={event => onChange({ x: Number(event.target.value) })} /></label>
      <label>Posição Y <input type="number" min="-32000" max="32000" disabled={settings.anchor !== 'manual'} value={settings.y} onChange={event => onChange({ y: Number(event.target.value) })} /></label>
    </div>
    <p>A posição se adapta à área útil do monitor. Ao arrastar, o posicionamento passa para manual. Janelas maiores que a tela permitem rolagem.</p>
    <label><input type="checkbox" checked={settings.focusOnly} onChange={event => onChange({ focusOnly: event.target.checked })} /> Mostrar partidas reais somente com o Age 2 em primeiro plano</label>
    <p>Desmarque para manter visível no Alt+Tab. A demonstração aparece mesmo fora do jogo.</p>
    <label><input type="checkbox" checked={settings.showProjection} onChange={event => onChange({ showProjection: event.target.checked })} /> Exibir projeção não oficial de ganho/perda de rating</label>
    <p>Controla os valores estimados com ~ durante a partida. O resultado real confirmado de uma partida concluída continua visível. Estimativas exigem uma fila 1v1 reconhecida e os ratings dos dois jogadores.</p>
    <label><input type="checkbox" checked={settings.locked} onChange={event => onChange({ locked: event.target.checked })} /> Travar overlay e passar cliques para o jogo</label>
    <p>Destrave por este painel para arrastar o overlay. {desktop && (shortcutAvailable ? 'Ctrl+Shift+O também alterna a trava.' : 'Ctrl+Shift+O está indisponível; use a opção acima.')}</p>
    <button onClick={() => onChange({ x: defaultSettings.x, y: defaultSettings.y, opacity: defaultSettings.opacity, scale: 1, monitorId: null, anchor: 'manual', locked: false })}>Restaurar posição, escala e opacidade</button>
  </fieldset>;
}
