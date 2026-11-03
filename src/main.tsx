import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { BrowserRuntime } from './infrastructure/browser-runtime';
import { TauriRuntime } from './infrastructure/tauri-runtime';
import { OverlayWindow } from './features/overlay/OverlayWindow';
import { LoadingScreen } from './features/shell/LoadingScreen';
import './styles.css';
import { AppErrorBoundary } from './features/shell/AppErrorBoundary';

const desktop = isTauri();
const overlay = desktop && new URLSearchParams(location.search).get('window') === 'overlay';
document.body.className = overlay ? 'overlay-window' : 'control-window';
const runtime = desktop ? new TauriRuntime() : new BrowserRuntime();
const ControlPanel = lazy(() => import('./features/settings/ControlPanel').then(module => ({ default: module.ControlPanel })));

createRoot(document.getElementById('root')!).render(<AppErrorBoundary><Suspense fallback={overlay ? null : <LoadingScreen />}>{overlay
  ? <OverlayWindow runtime={runtime} />
  : <ControlPanel runtime={runtime} desktop={desktop} />}</Suspense></AppErrorBoundary>);
