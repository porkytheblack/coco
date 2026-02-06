'use client';

import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import Image from 'next/image';
import { IconButton } from '@/components/ui';
import { ThemePicker } from '@/components/ui/theme-picker';
import { useAIStore } from '@/stores';

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface TopBarProps {
  breadcrumbs?: Breadcrumb[];
  showBack?: boolean;
  onBack?: () => void;
  onCommandPalette?: () => void;
  onCocoChat?: () => void;
  actions?: React.ReactNode;
}

export function TopBar({
  breadcrumbs = [],
  showBack = false,
  onBack,
  onCommandPalette,
  onCocoChat,
  actions,
}: TopBarProps) {
  const { settings: aiSettings } = useAIStore();

  return (
    <header className="h-12 pl-20 pr-4 border-b border-coco-border-subtle/50 flex items-center justify-between bg-coco-bg-primary backdrop-blur-sm drag-region">
      {/* Left: Back button + Breadcrumbs */}
      <div className="flex items-center gap-2 no-drag min-w-0 flex-1">
        {showBack && onBack && (
          <IconButton
            icon={<ArrowLeft className="w-4 h-4" />}
            label="Go back"
            onClick={onBack}
            className="flex-shrink-0"
          />
        )}

        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 min-w-0 overflow-hidden">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isClickable = !!crumb.onClick && !isLast;

              return (
                <div key={index} className="flex items-center gap-1 min-w-0">
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-coco-text-tertiary flex-shrink-0" />
                  )}
                  {isClickable ? (
                    <button
                      onClick={crumb.onClick}
                      className="text-sm text-coco-text-secondary hover:text-coco-text-primary transition-colors truncate max-w-[120px]"
                      title={crumb.label}
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span
                      className={`text-sm truncate max-w-[160px] ${
                        isLast
                          ? 'font-medium text-coco-text-primary'
                          : 'text-coco-text-secondary'
                      }`}
                      title={crumb.label}
                    >
                      {crumb.label}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Center: Command Palette Trigger */}
      {onCommandPalette && (
        <button
          onClick={onCommandPalette}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 w-[280px] bg-coco-bg-tertiary hover:bg-coco-bg-inset border border-coco-border-default hover:border-coco-border-strong rounded-lg transition-all no-drag group shadow-sm"
        >
          <Search className="w-4 h-4 text-coco-text-secondary group-hover:text-coco-text-primary transition-colors" />
          <span className="flex-1 text-sm text-coco-text-secondary text-left">Search commands...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-coco-text-secondary bg-coco-bg-secondary border border-coco-border-default rounded">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Right: Actions + AI Chat + Theme Picker */}
      <div className="flex items-center gap-1 no-drag flex-shrink-0">
        {actions}

        {onCocoChat && aiSettings.enabled && (
          <button
            onClick={onCocoChat}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-coco-bg-secondary transition-colors"
            title="Chat with Coco"
          >
            <Image
              src="/brand/coco-paw.png"
              alt="Chat with Coco"
              width={22}
              height={22}
            />
          </button>
        )}

        <ThemePicker />
      </div>
    </header>
  );
}
