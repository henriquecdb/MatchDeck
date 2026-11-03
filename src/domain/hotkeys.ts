export interface Hotkeys { lockOverlay: string | null; toggleOverlay: string | null; }
export const defaultHotkeys: Hotkeys = { lockOverlay: 'Ctrl+Shift+O', toggleOverlay: 'Ctrl+Shift+H' };
export const hotkeyModifiers = ['Ctrl', 'Alt', 'Shift', 'Super'] as const;
export const hotkeyKeys = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'0123456789', ...Array.from({ length: 24 }, (_, index) => `F${index + 1}`), 'Space', 'Tab', 'Enter', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function parseHotkeys(value: unknown): Hotkeys {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const binding = (key: keyof Hotkeys) => candidate[key] === null ? null : typeof candidate[key] === 'string' ? candidate[key] as string : defaultHotkeys[key];
  return { lockOverlay: binding('lockOverlay'), toggleOverlay: binding('toggleOverlay') };
}

export function hotkeyError(hotkeys: Hotkeys): string | null {
  for (const value of [hotkeys.lockOverlay, hotkeys.toggleOverlay]) {
    if (value === null) continue;
    const parts = value.split('+');
    const key = parts.pop() ?? '';
    if (!hotkeyKeys.includes(key) || parts.some(modifier => !hotkeyModifiers.includes(modifier as typeof hotkeyModifiers[number])) || new Set(parts).size !== parts.length || (!parts.length && !/^F\d+$/.test(key))) return 'Use uma tecla válida com um modificador, ou uma tecla de função.';
  }
  return hotkeys.lockOverlay && hotkeys.lockOverlay === hotkeys.toggleOverlay ? 'Cada ação deve usar um atalho diferente.' : null;
}

export function hotkeyLabel(value: string | null): string {
  return value?.replace('CommandOrControl', 'Ctrl').replace('Control', 'Ctrl').replace('Super', 'Win') ?? 'Desativado';
}
