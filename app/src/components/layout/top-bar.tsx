'use client';

import { ArrowLeft, Settings, Sun, Moon } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { useThemeStore } from '@/stores';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  actions?: React.ReactNode;
}

export function TopBar({
  title,
  subtitle,
  showBack = false,
  onBack,
  onSettings,
  actions,
}: TopBarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="h-14 px-4 border-b border-coco-border-subtle flex items-center justify-between bg-coco-bg-primary">
      <div className="flex items-center gap-3">
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

      <div className="flex items-center gap-1">
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
