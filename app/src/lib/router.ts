/**
 * Client-side router for Tauri app with Next.js static export.
 * Since static export doesn't support dynamic routes, we use client-side
 * URL parsing to determine which view to render.
 */

export type RouteParams = {
  view: 'chains' | 'chain-dashboard' | 'wallet-detail' | 'workspace' | 'scripts' | 'env';
  chainId?: string;
  walletId?: string;
  workspaceId?: string;
};

/**
 * Parse the current URL path into route parameters.
 *
 * Supported routes:
 * - /                                           → chains view
 * - /chain/:chainId                             → chain dashboard
 * - /chain/:chainId/wallets/:walletId           → wallet detail
 * - /chain/:chainId/workspaces/:workspaceId     → workspace (contracts tab)
 * - /chain/:chainId/workspaces/:workspaceId/scripts → scripts tab
 * - /chain/:chainId/workspaces/:workspaceId/env     → env variables tab
 */
export function parseRoute(pathname: string): RouteParams {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);

  // Root: chains view
  if (segments.length === 0) {
    return { view: 'chains' };
  }

  // /chain/:chainId
  if (segments[0] === 'chain' && segments.length >= 2) {
    const chainId = segments[1];

    // /chain/:chainId/wallets/:walletId
    if (segments[2] === 'wallets' && segments[3]) {
      return {
        view: 'wallet-detail',
        chainId,
        walletId: segments[3],
      };
    }

    // /chain/:chainId/workspaces/:workspaceId/scripts
    if (segments[2] === 'workspaces' && segments[3] && segments[4] === 'scripts') {
      return {
        view: 'scripts',
        chainId,
        workspaceId: segments[3],
      };
    }

    // /chain/:chainId/workspaces/:workspaceId/env
    if (segments[2] === 'workspaces' && segments[3] && segments[4] === 'env') {
      return {
        view: 'env',
        chainId,
        workspaceId: segments[3],
      };
    }

    // /chain/:chainId/workspaces/:workspaceId
    if (segments[2] === 'workspaces' && segments[3]) {
      return {
        view: 'workspace',
        chainId,
        workspaceId: segments[3],
      };
    }

    // /chain/:chainId (chain dashboard)
    return {
      view: 'chain-dashboard',
      chainId,
    };
  }

  // Default to chains view for unknown routes
  return { view: 'chains' };
}

/**
 * Build a URL path from route parameters.
 */
export function buildPath(params: RouteParams): string {
  switch (params.view) {
    case 'chains':
      return '/';
    case 'chain-dashboard':
      return `/chain/${params.chainId}`;
    case 'wallet-detail':
      return `/chain/${params.chainId}/wallets/${params.walletId}`;
    case 'workspace':
      return `/chain/${params.chainId}/workspaces/${params.workspaceId}`;
    case 'scripts':
      return `/chain/${params.chainId}/workspaces/${params.workspaceId}/scripts`;
    case 'env':
      return `/chain/${params.chainId}/workspaces/${params.workspaceId}/env`;
    default:
      return '/';
  }
}
