import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { logger } from '../lib/logger';

export interface UpdateInfo {
  version: string;
  notes: string;
}

export interface UseUpdaterOptions {
  checkOnMount?: boolean;
  autoCheckInterval?: number; // milliseconds
  silentCheck?: boolean;
}

export interface UseUpdaterReturn {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  isInstalling: boolean;
  checkForUpdates: (userTriggered?: boolean) => Promise<boolean>;
  installUpdate: () => Promise<void>;
}

export function useUpdater(options?: UseUpdaterOptions): UseUpdaterReturn {
  const {
    checkOnMount = true,
    autoCheckInterval = 10 * 60 * 1000, // 10 minutes default
    silentCheck = true
  } = options || {};

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const checkForUpdates = useCallback(async (userTriggered = false): Promise<boolean> => {
    setIsChecking(true);
    try {
      const update = await check();

      if (update?.available) {
        logger.info(`Update available: ${update.version}`);
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          notes: update.body || 'No release notes available',
        });
        return true;
      } else {
        if (userTriggered && !silentCheck) {
          await message('You are already on the latest version!', {
            title: 'No Update Available',
            kind: 'info',
          });
        }
        return false;
      }
    } catch (error) {
      logger.error(error, { context: 'check_for_updates' });
      if (userTriggered) {
        await message('Failed to check for updates. Please try again later.', {
          title: 'Update Check Failed',
          kind: 'error',
        });
      }
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [silentCheck]);

  const installUpdate = useCallback(async () => {
    setIsInstalling(true);
    try {
      const update = await check();

      if (update?.available) {
        const shouldInstall = await ask(
          `Install version ${update.version}?\n\nThe app will restart after installation.\n\nRelease notes:\n${update.body}`,
          {
            title: 'Confirm Update',
            kind: 'info',
            okLabel: 'Install & Restart',
            cancelLabel: 'Cancel',
          }
        );

        if (shouldInstall) {
          logger.info(`Installing update: ${update.version}`);
          await update.downloadAndInstall();
          await relaunch();
        }
      }
    } catch (error) {
      logger.error(error, { context: 'install_update' });
      await message('Failed to install update. Please try again later.', {
        title: 'Installation Failed',
        kind: 'error',
      });
    } finally {
      setIsInstalling(false);
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    if (checkOnMount) {
      const timer = setTimeout(() => {
        checkForUpdates(false);
      }, 3000); // Wait 3 seconds after app load

      return () => clearTimeout(timer);
    }
  }, [checkOnMount, checkForUpdates]);

  useEffect(() => {
    // Periodic automatic checks
    if (autoCheckInterval > 0) {
      const intervalId = setInterval(() => {
        checkForUpdates(false);
      }, autoCheckInterval);

      return () => clearInterval(intervalId);
    }
  }, [autoCheckInterval, checkForUpdates]);

  return {
    updateAvailable,
    updateInfo,
    isChecking,
    isInstalling,
    checkForUpdates,
    installUpdate,
  };
}
