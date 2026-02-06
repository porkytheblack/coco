'use client';

import { useEffect, useCallback } from 'react';
import { X, Download, RotateCcw, ArrowUpCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import {
  useUpdateStore,
  checkForUpdates,
  downloadAndInstall,
  relaunchApp,
} from '@/stores';

// Check for updates on mount and every 4 hours
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * UpdateNotification - a non-disruptive, dismissable banner that appears
 * at the bottom-right of the screen when an update is available.
 *
 * States:
 * - idle/checking: invisible
 * - available: shows "Update available" with version + Download button
 * - downloading: shows progress bar
 * - ready: shows "Restart to update" button
 * - error: shows error message (auto-dismisses after 10s)
 * - dismissed: invisible (user clicked X)
 */
export function UpdateNotification() {
  const { status, updateInfo, downloadProgress, errorMessage } = useUpdateStore();

  // Check for updates on mount and periodically
  useEffect(() => {
    // Initial check after a short delay so the app has time to settle
    const initialTimer = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    // Periodic check
    const intervalTimer = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  // Auto-dismiss errors after 10 seconds
  useEffect(() => {
    if (status === 'error') {
      const timer = setTimeout(() => {
        useUpdateStore.getState().reset();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleDismiss = useCallback(() => {
    useUpdateStore.getState().dismiss();
  }, []);

  const handleDownload = useCallback(() => {
    downloadAndInstall();
  }, []);

  const handleRestart = useCallback(() => {
    relaunchApp();
  }, []);

  // Don't show for invisible states
  if (status === 'idle' || status === 'checking' || status === 'dismissed') {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed bottom-10 right-4 z-[100]',
        'w-[320px] overflow-hidden',
        'bg-coco-bg-elevated border border-coco-border-default rounded-xl',
        'shadow-lg backdrop-blur-sm',
        'animate-slide-up'
      )}
    >
      {/* Progress bar for downloading state */}
      {status === 'downloading' && (
        <div className="h-1 bg-coco-bg-tertiary">
          <div
            className="h-full bg-coco-accent transition-all duration-300 ease-out"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={clsx(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              status === 'error'
                ? 'bg-coco-error-subtle text-coco-error'
                : 'bg-coco-accent-subtle text-coco-accent'
            )}
          >
            {status === 'downloading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status === 'ready' ? (
              <RotateCcw className="w-4 h-4" />
            ) : status === 'error' ? (
              <X className="w-4 h-4" />
            ) : (
              <ArrowUpCircle className="w-4 h-4" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-coco-text-primary truncate">
                {status === 'downloading'
                  ? 'Downloading update...'
                  : status === 'ready'
                    ? 'Update ready'
                    : status === 'error'
                      ? 'Update failed'
                      : 'Update available'}
              </h4>

              {/* Dismiss button (not shown while downloading) */}
              {status !== 'downloading' && (
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-coco-bg-tertiary text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-coco-text-secondary mt-0.5">
              {status === 'downloading'
                ? `${downloadProgress}% complete`
                : status === 'ready'
                  ? 'Restart the app to apply the update.'
                  : status === 'error'
                    ? errorMessage || 'An error occurred.'
                    : updateInfo
                      ? `v${updateInfo.version} is ready to download.`
                      : 'A new version is available.'}
            </p>

            {/* Action button */}
            {(status === 'available' || status === 'ready') && (
              <button
                onClick={status === 'ready' ? handleRestart : handleDownload}
                className={clsx(
                  'mt-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  'inline-flex items-center gap-1.5',
                  status === 'ready'
                    ? 'bg-coco-accent text-coco-text-inverse hover:bg-coco-accent-hover'
                    : 'bg-coco-bg-tertiary text-coco-text-primary hover:bg-coco-bg-inset border border-coco-border-subtle'
                )}
              >
                {status === 'ready' ? (
                  <>
                    <RotateCcw className="w-3 h-3" />
                    Restart Now
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Download Update
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
