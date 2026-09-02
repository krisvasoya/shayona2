import * as Updates from 'expo-updates';
import { create } from 'zustand';
import { networkService } from './network.service';

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'upToDate' | 'error';

interface UpdateState {
  status: UpdateStatus;
  isUpdateAvailable: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateReady: boolean;
  lastChecked: string | null;
  error: string | null;
  updateId: string | null;
  runtimeVersion: string | null;
  channel: string | null;
  appVersion: string;
  isUpdatesEnabled: boolean;

  // Actions
  checkForUpdate: (manual?: boolean) => Promise<{ isAvailable: boolean; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  applyUpdate: () => Promise<void>;
  resetStatus: () => void;
}

const APP_VERSION = '1.0.1';

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  isUpdateAvailable: false,
  isChecking: false,
  isDownloading: false,
  isUpdateReady: false,
  lastChecked: null,
  error: null,
  updateId: Updates.updateId || null,
  runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '1.0.1',
  channel: Updates.channel || null,
  appVersion: APP_VERSION,
  isUpdatesEnabled: Updates.isEnabled,

  checkForUpdate: async (manual = false) => {
    // Avoid multiple concurrent checks
    if (get().isChecking || get().isDownloading) {
      return { isAvailable: get().isUpdateAvailable };
    }

    const isOnline = networkService.isOnline();
    if (!isOnline) {
      const errMsg = 'OFFLINE';
      if (manual) {
        set({ status: 'error', error: errMsg });
      }
      return { isAvailable: false, error: errMsg };
    }

    if (!Updates.isEnabled) {
      // In Expo Go or development client where OTA updates are disabled
      set({
        isChecking: false,
        status: 'upToDate',
        lastChecked: new Date().toISOString(),
      });
      return { isAvailable: false };
    }

    try {
      set({ isChecking: true, status: 'checking', error: null });

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        set({
          isChecking: false,
          isUpdateAvailable: true,
          status: 'available',
          lastChecked: new Date().toISOString(),
          updateId: update.manifest ? (update.manifest as { id?: string }).id || null : null,
        });
        return { isAvailable: true };
      } else {
        set({
          isChecking: false,
          isUpdateAvailable: false,
          status: 'upToDate',
          lastChecked: new Date().toISOString(),
        });
        return { isAvailable: false };
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to check for updates';
      set({
        isChecking: false,
        status: get().isUpdateAvailable ? 'available' : 'error',
        error: errorMsg,
        lastChecked: new Date().toISOString(),
      });
      return { isAvailable: get().isUpdateAvailable, error: errorMsg };
    }
  },

  downloadUpdate: async () => {
    if (get().isDownloading) {
      return { success: false, error: 'Download already in progress' };
    }

    if (!Updates.isEnabled) {
      return { success: false, error: 'OTA updates are not enabled in this environment' };
    }

    try {
      set({ isDownloading: true, status: 'downloading', error: null });

      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        set({
          isDownloading: false,
          isUpdateReady: true,
          status: 'ready',
        });
        return { success: true };
      } else {
        set({
          isDownloading: false,
          isUpdateAvailable: false,
          status: 'upToDate',
        });
        return { success: true };
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to download update';
      set({
        isDownloading: false,
        status: 'error',
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }
  },

  applyUpdate: async () => {
    if (!Updates.isEnabled) return;
    try {
      await Updates.reloadAsync();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to reload app';
      set({ error: errorMsg });
    }
  },

  resetStatus: () => {
    set({
      status: get().isUpdateAvailable ? 'available' : 'idle',
      error: null,
    });
  },
}));

export const updateService = {
  getStore: () => useUpdateStore.getState(),
  checkForUpdate: (manual = false) => useUpdateStore.getState().checkForUpdate(manual),
  downloadUpdate: () => useUpdateStore.getState().downloadUpdate(),
  applyUpdate: () => useUpdateStore.getState().applyUpdate(),
};
