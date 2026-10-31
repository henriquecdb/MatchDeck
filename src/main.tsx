import { createRoot } from 'react-dom/client';
import { isTauri } from '@tauri-apps/api/core';
import { BrowserRuntime } from './infrastructure/browser-runtime';
import { TauriRuntime } from './infrastructure/tauri-runtime';
import { ControlPanel } from './features/settings/ControlPanel';
import { OverlayWindow } from './features/overlay/OverlayWindow';
import './styles.css';

const desktop = isTauri();
const overlay = desktop && new URLSearchParams(location.search).get('window') === 'overlay';
document.body.className = overlay ? 'overlay-window' : 'control-window';
const runtime = desktop ? new TauriRuntime() : new BrowserRuntime();

createRoot(document.getElementById('root')!).render(overlay
  ? <OverlayWindow runtime={runtime} />
  : <ControlPanel runtime={runtime} desktop={desktop} />);
