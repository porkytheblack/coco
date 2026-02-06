import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

export type CommandCategory = 'navigation' | 'actions' | 'settings' | 'ai';

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: LucideIcon;
  category: CommandCategory;
  shortcut?: string;
  execute: () => void;
  when?: () => boolean;
}

interface CommandState {
  commands: Map<string, Command>;
  isOpen: boolean;

  // Actions
  registerCommand: (command: Command) => void;
  registerCommands: (commands: Command[]) => void;
  unregisterCommand: (id: string) => void;
  unregisterCommands: (ids: string[]) => void;
  clearCommands: () => void;
  getCommands: () => Command[];
  getCommandsByCategory: (category: CommandCategory) => Command[];
  getAvailableCommands: () => Command[];
  executeCommand: (id: string) => boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

export const useCommandStore = create<CommandState>()((set, get) => ({
  commands: new Map(),
  isOpen: false,

  registerCommand: (command: Command) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      newCommands.set(command.id, command);
      return { commands: newCommands };
    });
  },

  registerCommands: (commands: Command[]) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      for (const command of commands) {
        newCommands.set(command.id, command);
      }
      return { commands: newCommands };
    });
  },

  unregisterCommand: (id: string) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      newCommands.delete(id);
      return { commands: newCommands };
    });
  },

  unregisterCommands: (ids: string[]) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      for (const id of ids) {
        newCommands.delete(id);
      }
      return { commands: newCommands };
    });
  },

  clearCommands: () => {
    set({ commands: new Map() });
  },

  getCommands: () => {
    return Array.from(get().commands.values());
  },

  getCommandsByCategory: (category: CommandCategory) => {
    return Array.from(get().commands.values()).filter(
      (cmd) => cmd.category === category
    );
  },

  getAvailableCommands: () => {
    return Array.from(get().commands.values()).filter(
      (cmd) => !cmd.when || cmd.when()
    );
  },

  executeCommand: (id: string) => {
    const command = get().commands.get(id);
    if (command && (!command.when || command.when())) {
      command.execute();
      set({ isOpen: false });
      return true;
    }
    return false;
  },

  openPalette: () => {
    set({ isOpen: true });
  },

  closePalette: () => {
    set({ isOpen: false });
  },

  togglePalette: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },
}));

// Detect if running on macOS - uses userAgentData with platform fallback.
const _isMac = typeof navigator !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (/mac/i.test((navigator as any).userAgentData?.platform ?? '') || /mac/i.test(navigator.userAgent));

// Helper to get the platform-specific modifier key display.
// NOTE: For use in React components, prefer useModifierKey() to avoid SSR hydration mismatch.
export function getModifierKey(): string {
  if (typeof window === 'undefined') return '⌘'; // Default to ⌘ for SSR (Tauri targets macOS primarily)
  return _isMac ? '⌘' : 'Ctrl';
}

// Helper to format keyboard shortcuts for display
export function formatShortcut(shortcut: string): string {
  const mod = getModifierKey();
  return shortcut.replace(/Mod/g, mod);
}
