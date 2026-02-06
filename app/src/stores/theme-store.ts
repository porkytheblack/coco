import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ThemeId,
  type ThemeMode,
  type ThemeDefinition,
  themes,
  getThemeById,
  getDefaultTheme,
} from '../data/themes';

type TauriTheme = 'light' | 'dark';

interface ThemeState {
  activeThemeId: ThemeId;
  mode: ThemeMode;
  setTheme: (themeId: ThemeId) => void;
  toggleMode: () => void;
  themes: ThemeDefinition[];
}

/**
 * Zustand store for managing application themes.
 * Persists the active theme ID to localStorage and applies theme CSS variables.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeThemeId: 'default-dark',
      mode: 'dark',
      themes,

      setTheme: (themeId: ThemeId) => {
        const theme = getThemeById(themeId);
        if (!theme) {
          console.warn(`Theme "${themeId}" not found, using default.`);
          const defaultTheme = getDefaultTheme('dark');
          set({ activeThemeId: defaultTheme.id, mode: defaultTheme.mode });
          applyTheme(defaultTheme);
          return;
        }

        set({ activeThemeId: themeId, mode: theme.mode });
        applyTheme(theme);
      },

      toggleMode: () => {
        const currentMode = get().mode;
        const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
        const currentThemeId = get().activeThemeId;

        // Try to find a matching theme in the opposite mode
        const matchingTheme = findMatchingThemeInMode(currentThemeId, newMode);
        const newTheme = matchingTheme || getDefaultTheme(newMode);

        set({ activeThemeId: newTheme.id, mode: newTheme.mode });
        applyTheme(newTheme);
      },
    }),
    {
      name: 'coco-theme',
      partialize: (state) => ({ activeThemeId: state.activeThemeId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const theme = getThemeById(state.activeThemeId);
          if (theme) {
            state.mode = theme.mode;
            applyTheme(theme);
          } else {
            const defaultTheme = getDefaultTheme('dark');
            state.activeThemeId = defaultTheme.id;
            state.mode = defaultTheme.mode;
            applyTheme(defaultTheme);
          }
        }
      },
    }
  )
);

/**
 * Find a matching theme in the target mode.
 * For example, if switching from gruvbox-dark to light mode, find gruvbox-light.
 */
function findMatchingThemeInMode(currentThemeId: ThemeId, targetMode: ThemeMode): ThemeDefinition | null {
  const currentTheme = getThemeById(currentThemeId);
  if (!currentTheme) {
    return null;
  }

  // Extract the base name (e.g., "gruvbox" from "gruvbox-dark")
  const baseName = currentThemeId.replace(/-dark$/, '').replace(/-light$/, '');

  // Look for a theme with the same base name but target mode suffix
  const targetThemeId = `${baseName}-${targetMode}` as ThemeId;
  const targetTheme = getThemeById(targetThemeId);

  if (targetTheme) {
    return targetTheme;
  }

  // Handle themes without mode suffix (e.g., "dracula", "monokai")
  // These are typically dark-only, so return null to fall back to default
  return null;
}

/**
 * Set the Tauri window theme for native title bar styling.
 */
async function setTauriTheme(theme: TauriTheme): Promise<void> {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const window = getCurrentWindow();
    await window.setTheme(theme);
  } catch {
    // Not running in Tauri or API not available
  }
}

/**
 * Apply a theme by setting CSS custom properties on the document root.
 */
function applyTheme(theme: ThemeDefinition): void {
  if (typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;

  // Add transitioning class for smooth color transitions
  root.classList.add('transitioning');

  // Apply all CSS custom properties from the theme
  for (const [property, value] of Object.entries(theme.colors)) {
    root.style.setProperty(property, value);
  }

  // Update dark mode class for Tailwind
  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update Tauri window theme for native title bar
  setTauriTheme(theme.mode);

  // Remove transitioning class after animation completes
  setTimeout(() => {
    root.classList.remove('transitioning');
  }, 300);
}

/**
 * Clear all theme-related inline styles from the document root.
 * This resets to the CSS-defined defaults in globals.css.
 */
function clearThemeStyles(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const themeProperties = [
    '--coco-bg-primary',
    '--coco-bg-secondary',
    '--coco-bg-tertiary',
    '--coco-bg-elevated',
    '--coco-bg-inset',
    '--coco-border-subtle',
    '--coco-border-default',
    '--coco-border-strong',
    '--coco-text-primary',
    '--coco-text-secondary',
    '--coco-text-tertiary',
    '--coco-text-inverse',
    '--coco-accent',
    '--coco-accent-hover',
    '--coco-accent-subtle',
    '--coco-accent-glow',
    '--coco-secondary',
    '--coco-secondary-hover',
    '--coco-secondary-subtle',
    '--coco-success',
    '--coco-success-subtle',
    '--coco-error',
    '--coco-error-subtle',
    '--coco-warning',
    '--coco-warning-subtle',
    '--coco-pending',
    '--coco-pending-subtle',
    '--coco-shadow-sm',
    '--coco-shadow-md',
    '--coco-shadow-lg',
    '--coco-shadow-drawer',
    '--coco-shadow-glow',
    '--coco-gradient-accent',
    '--coco-gradient-bg',
  ];

  for (const property of themeProperties) {
    root.style.removeProperty(property);
  }
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('coco-theme');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      const theme = getThemeById(state.activeThemeId);
      if (theme) {
        applyTheme(theme);
      } else {
        applyTheme(getDefaultTheme('dark'));
      }
    } catch {
      applyTheme(getDefaultTheme('dark'));
    }
  } else {
    // Apply default theme if no stored preference
    applyTheme(getDefaultTheme('dark'));
  }
}

// Re-export types for convenience
export type { ThemeId, ThemeMode, ThemeDefinition };
export { themes, getThemeById, getDefaultTheme };
