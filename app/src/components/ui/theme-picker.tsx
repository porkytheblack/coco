'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Sun, Moon, Palette, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStore, type ThemeDefinition } from '@/stores';

/**
 * A small color swatch preview showing the main colors of a theme.
 */
function ThemeSwatch({ theme, size = 'sm' }: { theme: ThemeDefinition; size?: 'sm' | 'md' }) {
  const bg = theme.colors['--coco-bg-primary'] || '#000';
  const accent = theme.colors['--coco-accent'] || '#888';
  const secondary = theme.colors['--coco-bg-secondary'] || '#333';
  const text = theme.colors['--coco-text-primary'] || '#fff';

  const px = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <div
      className={clsx(px, 'rounded-md flex-shrink-0 overflow-hidden border border-coco-border-subtle')}
      style={{ background: bg }}
    >
      <div className="w-full h-1/2 flex">
        <div className="w-1/2 h-full" style={{ background: accent }} />
        <div className="w-1/2 h-full" style={{ background: secondary }} />
      </div>
      <div className="w-full h-1/2 flex">
        <div className="w-1/2 h-full" style={{ background: text, opacity: 0.3 }} />
        <div className="w-1/2 h-full" style={{ background: bg }} />
      </div>
    </div>
  );
}

/**
 * ThemePicker - a dropdown popover for selecting themes.
 * Triggered by clicking the theme toggle button in the topbar.
 */
export function ThemePicker() {
  const { activeThemeId, mode, themes, setTheme, toggleMode } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'dark' | 'light'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const filteredThemes = filter === 'all'
    ? themes
    : themes.filter((t) => t.mode === filter);

  // Group themes by "family" for nicer display
  const darkThemes = filteredThemes.filter((t) => t.mode === 'dark');
  const lightThemes = filteredThemes.filter((t) => t.mode === 'light');

  const isDark = mode === 'dark';

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors',
          'hover:bg-coco-bg-secondary',
          isOpen && 'bg-coco-bg-secondary'
        )}
        title="Change theme"
      >
        {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        <ChevronDown className={clsx('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={clsx(
            'absolute right-0 top-full mt-2 z-50',
            'w-[280px] max-h-[420px] overflow-hidden',
            'bg-coco-bg-elevated border border-coco-border-default rounded-xl shadow-lg',
            'flex flex-col',
            'animate-fade-in'
          )}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-coco-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-coco-accent" />
              <span className="text-sm font-medium text-coco-text-primary">Themes</span>
            </div>
            {/* Quick toggle */}
            <button
              onClick={toggleMode}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-coco-bg-tertiary hover:bg-coco-bg-inset border border-coco-border-subtle text-coco-text-secondary transition-colors"
            >
              {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Filter tabs */}
          <div className="px-3 pt-2 pb-1 flex gap-1">
            {(['all', 'dark', 'light'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-2.5 py-1 text-xs rounded-md transition-colors capitalize',
                  filter === f
                    ? 'bg-coco-accent/10 text-coco-accent font-medium'
                    : 'text-coco-text-tertiary hover:text-coco-text-secondary hover:bg-coco-bg-tertiary'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Theme list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filter === 'all' ? (
              <>
                {darkThemes.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 flex items-center gap-1.5">
                      <Moon className="w-3 h-3 text-coco-text-tertiary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-coco-text-tertiary">
                        Dark
                      </span>
                    </div>
                    {darkThemes.map((theme) => (
                      <ThemeItem
                        key={theme.id}
                        theme={theme}
                        isActive={activeThemeId === theme.id}
                        onSelect={() => {
                          setTheme(theme.id);
                          setIsOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
                {lightThemes.length > 0 && (
                  <div>
                    <div className="px-2 py-1 flex items-center gap-1.5">
                      <Sun className="w-3 h-3 text-coco-text-tertiary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-coco-text-tertiary">
                        Light
                      </span>
                    </div>
                    {lightThemes.map((theme) => (
                      <ThemeItem
                        key={theme.id}
                        theme={theme}
                        isActive={activeThemeId === theme.id}
                        onSelect={() => {
                          setTheme(theme.id);
                          setIsOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              filteredThemes.map((theme) => (
                <ThemeItem
                  key={theme.id}
                  theme={theme}
                  isActive={activeThemeId === theme.id}
                  onSelect={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeItem({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left',
        isActive
          ? 'bg-coco-accent/10 text-coco-text-primary'
          : 'text-coco-text-secondary hover:bg-coco-bg-tertiary hover:text-coco-text-primary'
      )}
    >
      <ThemeSwatch theme={theme} />
      <span className="flex-1 text-sm truncate">{theme.name}</span>
      {isActive && <Check className="w-3.5 h-3.5 text-coco-accent flex-shrink-0" />}
    </button>
  );
}
