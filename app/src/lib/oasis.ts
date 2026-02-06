import { initOasis, type OasisInstance } from '@oasis/sdk';

let oasisInstance: OasisInstance | null = null;

const OASIS_API_KEY = process.env.NEXT_PUBLIC_OASIS_API_KEY ?? '';
const OASIS_SERVER_URL = process.env.NEXT_PUBLIC_OASIS_SERVER_URL ?? '';
const APP_VERSION = '0.1.1';

/**
 * Get the Oasis SDK instance, initializing it if necessary.
 * Returns null if the required environment variables are not configured.
 */
export function getOasis(): OasisInstance | null {
  if (oasisInstance) return oasisInstance;

  if (!OASIS_API_KEY || !OASIS_SERVER_URL) {
    return null;
  }

  try {
    oasisInstance = initOasis({
      apiKey: OASIS_API_KEY,
      serverUrl: OASIS_SERVER_URL,
      appVersion: APP_VERSION,
      enableAutoCrashReporting: true,
      debug: process.env.NODE_ENV === 'development',
    });
    return oasisInstance;
  } catch {
    // Silently fail if SDK init fails (e.g., invalid config)
    return null;
  }
}

/**
 * Destroy the Oasis instance and clean up resources.
 */
export function destroyOasis(): void {
  if (oasisInstance) {
    oasisInstance.destroy();
    oasisInstance = null;
  }
}
