'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Navigation, Zap, Settings, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { useCommandStore, formatShortcut, type Command, type CommandCategory } from '@/stores/command-store';

// Category display configuration
const categoryConfig: Record<CommandCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  navigation: { label: 'Navigation', icon: Navigation },
  actions: { label: 'Actions', icon: Zap },
  settings: { label: 'Settings', icon: Settings },
  ai: { label: 'AI', icon: MessageSquare },
};

// Category display order
const categoryOrder: CommandCategory[] = ['navigation', 'actions', 'settings', 'ai'];

// Simple fuzzy matching - case-insensitive substring match with scoring
function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match gets highest score
  if (lowerText === lowerQuery) {
    return { matches: true, score: 100 };
  }

  // Starts with query gets high score
  if (lowerText.startsWith(lowerQuery)) {
    return { matches: true, score: 80 };
  }

  // Contains query gets medium score
  if (lowerText.includes(lowerQuery)) {
    return { matches: true, score: 60 };
  }

  // Check if all query characters appear in order (fuzzy)
  let queryIndex = 0;
  let score = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      score += 10;
      // Bonus for consecutive matches
      if (i > 0 && lowerText[i - 1] === lowerQuery[queryIndex - 1]) {
        score += 5;
      }
      queryIndex++;
    }
  }

  if (queryIndex === lowerQuery.length) {
    return { matches: true, score };
  }

  return { matches: false, score: 0 };
}

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandItem({ command, isSelected, onSelect, onHover }: CommandItemProps) {
  const Icon = command.icon;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg',
        isSelected
          ? 'bg-coco-accent/10 text-coco-text-primary'
          : 'text-coco-text-secondary hover:bg-coco-bg-tertiary'
      )}
    >
      {Icon && (
        <Icon className={clsx(
          'w-4 h-4 flex-shrink-0',
          isSelected ? 'text-coco-accent' : 'text-coco-text-tertiary'
        )} />
      )}
      <div className="flex-1 min-w-0">
        <span className={clsx(
          'text-sm font-medium block truncate',
          isSelected && 'text-coco-text-primary'
        )}>
          {command.name}
        </span>
        {command.description && (
          <span className="text-xs text-coco-text-tertiary block truncate">
            {command.description}
          </span>
        )}
      </div>
      {command.shortcut && (
        <kbd className={clsx(
          'px-1.5 py-0.5 text-[10px] font-mono rounded border flex-shrink-0',
          isSelected
            ? 'bg-coco-accent/10 border-coco-accent/30 text-coco-accent'
            : 'bg-coco-bg-tertiary border-coco-border-subtle text-coco-text-tertiary'
        )}>
          {formatShortcut(command.shortcut)}
        </kbd>
      )}
    </button>
  );
}

interface CategorySectionProps {
  category: CommandCategory;
  commands: Command[];
  selectedIndex: number;
  baseIndex: number;
  onSelect: (command: Command) => void;
  onHover: (index: number) => void;
}

function CategorySection({ category, commands, selectedIndex, baseIndex, onSelect, onHover }: CategorySectionProps) {
  const config = categoryConfig[category];
  const CategoryIcon = config.icon;

  if (commands.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
        <CategoryIcon className="w-3 h-3 text-coco-text-tertiary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-coco-text-tertiary">
          {config.label}
        </span>
      </div>
      <div className="space-y-0.5">
        {commands.map((command, index) => (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={selectedIndex === baseIndex + index}
            onSelect={() => onSelect(command)}
            onHover={() => onHover(baseIndex + index)}
          />
        ))}
      </div>
    </div>
  );
}

export function CommandPalette() {
  const { isOpen, closePalette, getAvailableCommands, executeCommand } = useCommandStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get and filter commands
  const availableCommands = useMemo(() => getAvailableCommands(), [getAvailableCommands, isOpen]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return availableCommands;
    }

    // Score and filter commands
    const scored = availableCommands.map((command) => {
      const nameMatch = fuzzyMatch(query, command.name);
      const descMatch = command.description ? fuzzyMatch(query, command.description) : { matches: false, score: 0 };
      const bestScore = Math.max(nameMatch.score, descMatch.score * 0.8);
      return {
        command,
        score: bestScore,
        matches: nameMatch.matches || descMatch.matches,
      };
    });

    return scored
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.command);
  }, [availableCommands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<CommandCategory, Command[]> = {
      navigation: [],
      actions: [],
      settings: [],
      ai: [],
    };

    for (const command of filteredCommands) {
      groups[command.category].push(command);
    }

    return groups;
  }, [filteredCommands]);

  // Calculate flat list with category offsets for keyboard navigation
  const flatCommandList = useMemo(() => {
    const list: Command[] = [];
    for (const category of categoryOrder) {
      list.push(...groupedCommands[category]);
    }
    return list;
  }, [groupedCommands]);

  // Calculate base indices for each category
  const categoryBaseIndices = useMemo(() => {
    const indices: Record<CommandCategory, number> = {
      navigation: 0,
      actions: 0,
      settings: 0,
      ai: 0,
    };

    let currentIndex = 0;
    for (const category of categoryOrder) {
      indices[category] = currentIndex;
      currentIndex += groupedCommands[category].length;
    }

    return indices;
  }, [groupedCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure the modal is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatCommandList.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, flatCommandList.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatCommandList.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatCommandList.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommandList[selectedIndex]) {
          executeCommand(flatCommandList[selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closePalette();
        break;
    }
  }, [flatCommandList, selectedIndex, executeCommand, closePalette]);

  const handleSelect = useCallback((command: Command) => {
    executeCommand(command.id);
  }, [executeCommand]);

  const handleHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          closePalette();
        } else {
          useCommandStore.getState().openPalette();
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closePalette();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, closePalette]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closePalette}
      />

      {/* Palette container */}
      <div
        className={clsx(
          'relative w-full max-w-xl mx-4',
          'bg-coco-bg-elevated/95 backdrop-blur-xl',
          'border border-coco-border-subtle rounded-xl shadow-2xl',
          'animate-scale-in origin-top'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-coco-border-subtle">
          <Search className="w-5 h-5 text-coco-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className={clsx(
              'flex-1 bg-transparent text-sm text-coco-text-primary',
              'placeholder:text-coco-text-tertiary',
              'focus:outline-none'
            )}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border bg-coco-bg-tertiary border-coco-border-subtle text-coco-text-tertiary">
            ESC
          </kbd>
        </div>

        {/* Commands list */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {flatCommandList.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-coco-text-tertiary">No commands found</p>
              {query && (
                <p className="text-xs text-coco-text-tertiary mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <>
              {categoryOrder.map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  commands={groupedCommands[category]}
                  selectedIndex={selectedIndex}
                  baseIndex={categoryBaseIndices[category]}
                  onSelect={handleSelect}
                  onHover={handleHover}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-coco-border-subtle bg-coco-bg-secondary/50 rounded-b-xl">
          <div className="flex items-center gap-4 text-[10px] text-coco-text-tertiary">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono rounded border bg-coco-bg-tertiary border-coco-border-subtle">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono rounded border bg-coco-bg-tertiary border-coco-border-subtle">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono rounded border bg-coco-bg-tertiary border-coco-border-subtle">
                ESC
              </kbd>
              Close
            </span>
          </div>
          <span className="text-[10px] text-coco-text-tertiary">
            {flatCommandList.length} command{flatCommandList.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
