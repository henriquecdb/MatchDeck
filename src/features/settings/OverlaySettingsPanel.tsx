import type { OverlaySettings } from '../../domain/settings';
import { defaultSettings } from '../../domain/settings';

interface Props {
  settings: OverlaySettings;
  desktop: boolean;
  shortcutAvailable: boolean;
  onChange(patch: Partial<OverlaySettings>): void;
}

export function OverlaySettingsPanel({ settings, desktop, shortcutAvailable, onChange }: Props) {
  return <fieldset>
    <legend>Aparência e posição</legend>
    <label>Modo de exibição <select value={settings.layout} onChange={event => onChange({ layout: event.target.value as OverlaySettings['layout'] })}>
      <option value="detailed">Completo · cards com unidades</option><option value="compact">Compacto · faixa por equipes</option>
    </select></label>
    <p>O compacto organiza os jogadores em linhas, com os emblemas das civilizações. O completo mantém as unidades e as estatísticas detalhadas.</p>
    <label>Opacidade: {Math.round(settings.opacity * 100)}%
      <input type="range" min="0.2" max="1" step="0.05" value={settings.opacity} onChange={event => onChange({ opacity: Number(event.target.value) })} />
    </label>
    <div className="coordinates">
      <label>Posição X <input type="number" min="-32000" max="32000" value={settings.x} onChange={event => onChange({ x: Number(event.target.value) })} /></label>
      <label>Posição Y <input type="number" min="-32000" max="32000" value={settings.y} onChange={event => onChange({ y: Number(event.target.value) })} /></label>
    </div>
    <label><input type="checkbox" checked={settings.locked} onChange={event => onChange({ locked: event.target.checked })} /> Travar overlay e passar cliques para o jogo</label>
    <p>Destrave por este painel para arrastar o overlay. {desktop && (shortcutAvailable ? 'Ctrl+Shift+O também alterna a trava.' : 'Ctrl+Shift+O está indisponível; use a opção acima.')}</p>
    <button onClick={() => onChange({ x: defaultSettings.x, y: defaultSettings.y, opacity: defaultSettings.opacity, locked: false })}>Restaurar posição e opacidade</button>
  </fieldset>;
}
