import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { UpdatePort, UpdateProgress } from '../domain/updates';

export class NativeUpdater implements UpdatePort {
  private pending: Update | null = null;

  constructor(private canInstall: () => boolean) {}

  async check() {
    await this.dispose();
    this.pending = await check({ timeout: 15000 });
    return this.pending ? {
      currentVersion: this.pending.currentVersion,
      version: this.pending.version,
      notes: this.pending.body ?? '',
    } : null;
  }

  async install(progress: (value: UpdateProgress) => void) {
    if (!this.pending) throw new Error('Verifique as atualizações novamente.');
    if (!this.canInstall()) throw new Error('Encerre o teste e desative a detecção antes de atualizar.');
    const update = this.pending;
    let downloaded = 0;
    let total: number | undefined;
    await update.download(event => {
      if (event.event === 'Started') total = event.data.contentLength;
      if (event.event === 'Progress') downloaded += event.data.chunkLength;
      progress({ phase: 'downloading', downloaded, total });
    });
    if (!this.canInstall()) throw new Error('A detecção foi ativada durante o download. Desative-a e tente novamente.');
    localStorage.setItem('matchdeck.previousVersion', update.currentVersion);
    progress({ phase: 'installing', downloaded, total });
    await update.install({ restartAfterInstall: true });
    await relaunch();
  }

  async dispose() {
    if (this.pending) await this.pending.close();
    this.pending = null;
  }
}
