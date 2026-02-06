'use client';

import { Sun, Moon, Wifi, WifiOff, Command, ArrowUpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStore, useAIStore, useCommandStore, useUpdateStore } from '@/stores';
import { getModifierKey } from '@/stores/command-store';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface StatusBarProps {
  breadcrumbs?: BreadcrumbItem[];
  statusMessage?: string;
}

export function StatusBar({ breadcrumbs = [], statusMessage }: StatusBarProps) {
  const { mode } = useThemeStore();
  const { settings: aiSettings } = useAIStore();
  const { openPalette } = useCommandStore();
  const { status: updateStatus, updateInfo } = useUpdateStore();

  const isDark = mode === 'dark';
  const modKey = getModifierKey();

  // AI connection status - if enabled and has API key configured
  const aiConnected = aiSettings.enabled &&
    aiSettings.providers[aiSettings.provider]?.apiKey;

  return (
    <div className={clsx(
      'h-6 px-3 flex items-center justify-between',
      'bg-coco-bg-secondary border-t border-coco-border-subtle',
      'text-[11px] select-none'
    )}>
      {/* Left side - Breadcrumbs */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="flex items-center gap-1 min-w-0">
                {index > 0 && (
                  <span className="text-coco-text-tertiary flex-shrink-0">/</span>
                )}
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className="text-coco-text-secondary hover:text-coco-accent transition-colors truncate"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="text-coco-text-tertiary truncate">
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <span className="text-coco-text-tertiary">Coco</span>
        )}
      </div>

      {/* Center - Status message */}
      {statusMessage && (
        <div className="flex-shrink-0 px-4">
          <span className="text-coco-text-tertiary">{statusMessage}</span>
        </div>
      )}

      {/* Right side - Indicators */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Command palette trigger */}
        <button
          onClick={openPalette}
          className="flex items-center gap-1.5 text-coco-text-tertiary hover:text-coco-text-secondary transition-colors"
          title={`Command Palette (${modKey}+K)`}
        >
          <Command className="w-3 h-3" />
          <span className="font-mono text-[10px]">{modKey}+K</span>
        </button>

        {/* Separator */}
        <div className="w-px h-3 bg-coco-border-subtle" />

        {/* Theme indicator */}
        <div
          className="flex items-center gap-1 text-coco-text-tertiary"
          title={isDark ? 'Dark mode' : 'Light mode'}
        >
          {isDark ? (
            <Moon className="w-3 h-3" />
          ) : (
            <Sun className="w-3 h-3" />
          )}
        </div>

        {/* AI status indicator */}
        {aiSettings.enabled && (
          <div
            className={clsx(
              'flex items-center gap-1',
              aiConnected ? 'text-coco-success' : 'text-coco-text-tertiary'
            )}
            title={aiConnected ? 'AI Connected' : 'AI Not Connected'}
          >
            {aiConnected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            <span className="text-[10px]">AI</span>
          </div>
        )}

        {/* Version + Update indicator */}
        <div className="flex items-center gap-1">
          {(updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready') && (
            <span
              title={
                updateStatus === 'ready'
                  ? 'Update ready - restart to apply'
                  : updateStatus === 'downloading'
                    ? 'Downloading update...'
                    : `Update available: v${updateInfo?.version ?? ''}`
              }
            >
              <ArrowUpCircle
                className={clsx(
                  'w-3 h-3',
                  updateStatus === 'ready' ? 'text-coco-success' : 'text-coco-accent',
                  updateStatus === 'downloading' && 'animate-pulse'
                )}
              />
            </span>
          )}
          <span className="text-coco-text-tertiary font-mono text-[10px]">
            v0.1.4
          </span>
        </div>
      </div>
    </div>
  );
}
