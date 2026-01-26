/**
 * AI Actions Module
 *
 * This module provides an in-app AI action adapter that allows the AI
 * to execute actions within the app using existing functionality.
 */

export * from './types';
export * from './registry';

// Re-export action definitions for direct access if needed
export { chainActions } from './definitions/chains';
export { walletActions } from './definitions/wallets';
export { workspaceActions } from './definitions/workspaces';
export { contractActions } from './definitions/contracts';
export { transactionActions } from './definitions/transactions';
export { navigationActions } from './definitions/navigation';
export { infoActions } from './definitions/info';
