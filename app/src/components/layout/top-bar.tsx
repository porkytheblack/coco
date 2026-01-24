'use client';

import { ArrowLeft, Settings, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import { IconButton } from '@/components/ui';
import { useThemeStore, useAIStore } from '@/stores';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  onCocoChat?: () => void;
  actions?: React.ReactNode;
}

export function TopBar({
  title,
  subtitle,
  showBack = false,
  onBack,
  onSettings,
  onCocoChat,
  actions,
}: TopBarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { settings: aiSettings } = useAIStore();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="h-14 pl-20 pr-4 border-b border-coco-border-subtle flex items-center justify-between bg-coco-bg-primary drag-region">
      <div className="flex items-center gap-3 no-drag">
        {showBack && onBack && (
          <IconButton
            icon={<ArrowLeft className="w-5 h-5" />}
            label="Go back"
            onClick={onBack}
          />
        )}
        <div>
          <h1 className="text-base font-semibold text-coco-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-xs text-coco-text-tertiary">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center - Coco Chat Button */}
      {onCocoChat && aiSettings.enabled && (
        <button
          onClick={onCocoChat}
          className="absolute left-1/2 -translate-x-1/2 p-2 rounded-full hover:bg-coco-bg-secondary transition-colors no-drag"
          title="Chat with Coco"
        >
          <Image
            src="/brand/coco-paw.png"
            alt="Chat with Coco"
            width={24}
            height={24}
          />
        </button>
      )}

      <div className="flex items-center gap-1 no-drag">
        {actions}
        <IconButton
          icon={isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          label="Toggle theme"
          onClick={toggleTheme}
        />
        {onSettings && (
          <IconButton
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            onClick={onSettings}
          />
        )}
      </div>
    </header>
  );
}
