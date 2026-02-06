import { create } from 'zustand';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'dismissed';

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  errorMessage: string | null;
  lastChecked: number | null;

  // Actions
  setChecking: () => void;
  setAvailable: (info: UpdateInfo) => void;
  setDownloading: (progress: number) => void;
  setReady: () => void;
  setError: (message: string) => void;
  dismiss: () => void;
  reset: () => void;
}

/**
 * Zustand store for managing application update state.
 * Tracks whether an update is available, download progress, and user dismissals.
 */
export const useUpdateStore = create<UpdateState>((set) => ({
  status: 'idle',
  updateInfo: null,
  downloadProgress: 0,
  errorMessage: null,
  lastChecked: null,

  setChecking: () =>
    set({
      status: 'checking',
      errorMessage: null,
    }),

  setAvailable: (info) =>
    set({
      status: 'available',
      updateInfo: info,
      lastChecked: Date.now(),
    }),

  setDownloading: (progress) =>
    set({
      status: 'downloading',
      downloadProgress: progress,
    }),

  setReady: () =>
    set({
      status: 'ready',
    }),

  setError: (message) =>
    set({
      status: 'error',
      errorMessage: message,
      lastChecked: Date.now(),
    }),

  dismiss: () =>
    set({
      status: 'dismissed',
    }),

  reset: () =>
    set({
      status: 'idle',
      updateInfo: null,
      downloadProgress: 0,
      errorMessage: null,
    }),
}));

/**
 * Check for updates using the Tauri updater plugin.
 * This is safe to call even outside of Tauri (it will silently fail).
 */
export async function checkForUpdates(): Promise<void> {
  const store = useUpdateStore.getState();

  // Don't check if already downloading or ready
  if (store.status === 'downloading' || store.status === 'ready') {
    return;
  }

  store.setChecking();

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (update) {
      store.setAvailable({
        version: update.version,
        date: update.date ?? undefined,
        body: update.body ?? undefined,
      });
    } else {
      // No update available - go back to idle
      useUpdateStore.setState({ status: 'idle', lastChecked: Date.now() });
    }
  } catch (error) {
    // Silently fail in non-Tauri environments (e.g., browser dev mode)
    const message = error instanceof Error ? error.message : 'Failed to check for updates';

    // If endpoints are empty or not configured, just go idle instead of showing an error
    if (message.includes('empty') || message.includes('endpoint') || message.includes('url')) {
      useUpdateStore.setState({ status: 'idle', lastChecked: Date.now() });
    } else {
      store.setError(message);
    }
  }
}

/**
 * Download and install the available update.
 */
export async function downloadAndInstall(): Promise<void> {
  const store = useUpdateStore.getState();

  if (store.status !== 'available' || !store.updateInfo) {
    return;
  }

  store.setDownloading(0);

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update) {
      store.setError('Update no longer available');
      return;
    }

    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength ?? 0;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          if (contentLength > 0) {
            store.setDownloading(Math.round((downloaded / contentLength) * 100));
          }
          break;
        case 'Finished':
          store.setReady();
          break;
      }
    });

    // After download+install, prompt restart
    store.setReady();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to download update';
    store.setError(message);
  }
}

/**
 * Relaunch the application after an update has been installed.
 * Uses Tauri core invoke to call the `plugin:process|restart` command.
 */
export async function relaunchApp(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('plugin:process|restart');
  } catch {
    // Fallback: try window reload (won't actually restart the Tauri process,
    // but the user can manually restart)
    window.location.reload();
  }
}
