/**
 * Theme definitions for the Coco application.
 * Each theme provides a complete set of CSS custom property values.
 */

export type ThemeMode = 'light' | 'dark';

export type ThemeId =
  | 'default-dark'
  | 'default-light'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'dracula'
  | 'nord-dark'
  | 'nord-light'
  | 'monokai'
  | 'solarized-dark'
  | 'solarized-light'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'tokyo-night'
  | 'one-dark'
  | 'github-dark'
  | 'github-light';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  colors: Record<string, string>;
}

/**
 * Helper to create shadow and gradient values derived from accent colors.
 */
function createDerivedValues(
  accentColor: string,
  accentGlowOpacity: number,
  mode: ThemeMode,
  bgPrimary: string,
  bgSecondary: string,
  secondaryColor: string
): Record<string, string> {
  const shadowMultiplier = mode === 'dark' ? 1 : 0.5;

  return {
    '--coco-accent-glow': accentColor.startsWith('rgba')
      ? accentColor.replace(/[\d.]+\)$/, `${accentGlowOpacity})`)
      : `rgba(${hexToRgb(accentColor)}, ${accentGlowOpacity})`,
    '--coco-shadow-sm': mode === 'dark'
      ? `0 1px 2px rgba(0, 0, 0, ${0.5 * shadowMultiplier})`
      : `0 1px 2px rgba(0, 0, 0, ${0.04 * shadowMultiplier})`,
    '--coco-shadow-md': mode === 'dark'
      ? `0 4px 6px -1px rgba(0, 0, 0, ${0.6 * shadowMultiplier}), 0 2px 4px -2px rgba(0, 0, 0, ${0.4 * shadowMultiplier})`
      : `0 4px 6px -1px rgba(0, 0, 0, ${0.06 * shadowMultiplier}), 0 2px 4px -2px rgba(0, 0, 0, ${0.04 * shadowMultiplier})`,
    '--coco-shadow-lg': mode === 'dark'
      ? `0 10px 15px -3px rgba(0, 0, 0, ${0.7 * shadowMultiplier}), 0 4px 6px -4px rgba(0, 0, 0, ${0.5 * shadowMultiplier})`
      : `0 10px 15px -3px rgba(0, 0, 0, ${0.08 * shadowMultiplier}), 0 4px 6px -4px rgba(0, 0, 0, ${0.04 * shadowMultiplier})`,
    '--coco-shadow-drawer': mode === 'dark'
      ? `-4px 0 24px rgba(0, 0, 0, ${0.7 * shadowMultiplier})`
      : `-4px 0 24px rgba(0, 0, 0, ${0.08 * shadowMultiplier})`,
    '--coco-shadow-glow': `0 0 ${mode === 'dark' ? '30px' : '20px'} rgba(${hexToRgb(accentColor)}, ${accentGlowOpacity})`,
    '--coco-gradient-accent': `linear-gradient(135deg, ${accentColor} 0%, ${secondaryColor} 100%)`,
    '--coco-gradient-bg': `linear-gradient(180deg, ${bgSecondary} 0%, ${bgPrimary} 100%)`,
  };
}

/**
 * Convert hex color to RGB values string.
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return '0, 0, 0';
  }
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Create a complete theme definition with all required CSS variables.
 */
function createTheme(
  id: ThemeId,
  name: string,
  mode: ThemeMode,
  baseColors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgElevated: string;
    bgInset: string;
    borderSubtle: string;
    borderDefault: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    accent: string;
    accentHover: string;
    accentSubtle: string;
    secondary: string;
    secondaryHover?: string;
    secondarySubtle?: string;
    error: string;
    errorSubtle?: string;
    warning: string;
    warningSubtle?: string;
    success: string;
    successSubtle?: string;
    pending?: string;
    pendingSubtle?: string;
  }
): ThemeDefinition {
  const accentGlowOpacity = mode === 'dark' ? 0.25 : 0.15;

  const derivedValues = createDerivedValues(
    baseColors.accent,
    accentGlowOpacity,
    mode,
    baseColors.bgPrimary,
    baseColors.bgSecondary,
    baseColors.secondary
  );

  const secondaryHover = baseColors.secondaryHover || adjustColor(baseColors.secondary, mode === 'dark' ? 20 : -20);
  const secondarySubtle = baseColors.secondarySubtle || `rgba(${hexToRgb(baseColors.secondary)}, 0.15)`;
  const errorSubtle = baseColors.errorSubtle || `rgba(${hexToRgb(baseColors.error)}, 0.15)`;
  const warningSubtle = baseColors.warningSubtle || `rgba(${hexToRgb(baseColors.warning)}, 0.15)`;
  const successSubtle = baseColors.successSubtle || `rgba(${hexToRgb(baseColors.success)}, 0.15)`;
  const pending = baseColors.pending || baseColors.textTertiary;
  const pendingSubtle = baseColors.pendingSubtle || `rgba(${hexToRgb(pending)}, 0.15)`;

  return {
    id,
    name,
    mode,
    colors: {
      '--coco-bg-primary': baseColors.bgPrimary,
      '--coco-bg-secondary': baseColors.bgSecondary,
      '--coco-bg-tertiary': baseColors.bgTertiary,
      '--coco-bg-elevated': baseColors.bgElevated,
      '--coco-bg-inset': baseColors.bgInset,
      '--coco-border-subtle': baseColors.borderSubtle,
      '--coco-border-default': baseColors.borderDefault,
      '--coco-border-strong': baseColors.borderStrong,
      '--coco-text-primary': baseColors.textPrimary,
      '--coco-text-secondary': baseColors.textSecondary,
      '--coco-text-tertiary': baseColors.textTertiary,
      '--coco-text-inverse': baseColors.textInverse,
      '--coco-accent': baseColors.accent,
      '--coco-accent-hover': baseColors.accentHover,
      '--coco-accent-subtle': baseColors.accentSubtle,
      '--coco-secondary': baseColors.secondary,
      '--coco-secondary-hover': secondaryHover,
      '--coco-secondary-subtle': secondarySubtle,
      '--coco-success': baseColors.success,
      '--coco-success-subtle': successSubtle,
      '--coco-error': baseColors.error,
      '--coco-error-subtle': errorSubtle,
      '--coco-warning': baseColors.warning,
      '--coco-warning-subtle': warningSubtle,
      '--coco-pending': pending,
      '--coco-pending-subtle': pendingSubtle,
      ...derivedValues,
    },
  };
}

/**
 * Adjust a hex color by a given amount (positive = lighter, negative = darker).
 */
function adjustColor(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return hex;
  }

  const r = Math.min(255, Math.max(0, parseInt(result[1], 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(result[2], 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(result[3], 16) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * All available themes in the application.
 */
export const themes: ThemeDefinition[] = [
  // Default Dark - Trigger.dev inspired
  createTheme('default-dark', 'Default Dark', 'dark', {
    bgPrimary: '#0A0A0B',
    bgSecondary: '#0F0F10',
    bgTertiary: '#18181B',
    bgElevated: '#121214',
    bgInset: '#09090A',
    borderSubtle: '#1F1F23',
    borderDefault: '#27272A',
    borderStrong: '#3F3F46',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#52525B',
    textInverse: '#09090B',
    accent: '#22C55E',
    accentHover: '#4ADE80',
    accentSubtle: 'rgba(34, 197, 94, 0.15)',
    secondary: '#38BDF8',
    secondaryHover: '#7DD3FC',
    secondarySubtle: 'rgba(56, 189, 248, 0.15)',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#22C55E',
    pending: '#71717A',
  }),

  // Default Light - Clean, modern, professional
  createTheme('default-light', 'Default Light', 'light', {
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F8FAFC',
    bgTertiary: '#F1F5F9',
    bgElevated: '#FFFFFF',
    bgInset: '#E2E8F0',
    borderSubtle: '#E2E8F0',
    borderDefault: '#CBD5E1',
    borderStrong: '#94A3B8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    accent: '#16A34A',
    accentHover: '#15803D',
    accentSubtle: '#DCFCE7',
    secondary: '#3B82F6',
    secondaryHover: '#2563EB',
    secondarySubtle: '#DBEAFE',
    error: '#DC2626',
    errorSubtle: '#FEE2E2',
    warning: '#D97706',
    warningSubtle: '#FEF3C7',
    success: '#16A34A',
    successSubtle: '#DCFCE7',
    pending: '#64748B',
    pendingSubtle: '#F1F5F9',
  }),

  // Gruvbox Dark
  createTheme('gruvbox-dark', 'Gruvbox Dark', 'dark', {
    bgPrimary: '#282828',
    bgSecondary: '#3c3836',
    bgTertiary: '#504945',
    bgElevated: '#32302f',
    bgInset: '#1d2021',
    borderSubtle: '#504945',
    borderDefault: '#665c54',
    borderStrong: '#7c6f64',
    textPrimary: '#ebdbb2',
    textSecondary: '#d5c4a1',
    textTertiary: '#a89984',
    textInverse: '#282828',
    accent: '#b8bb26',
    accentHover: '#98971a',
    accentSubtle: 'rgba(184, 187, 38, 0.15)',
    secondary: '#83a598',
    error: '#fb4934',
    warning: '#fabd2f',
    success: '#b8bb26',
  }),

  // Gruvbox Light
  createTheme('gruvbox-light', 'Gruvbox Light', 'light', {
    bgPrimary: '#fbf1c7',
    bgSecondary: '#f2e5bc',
    bgTertiary: '#ebdbb2',
    bgElevated: '#f9f5d7',
    bgInset: '#d5c4a1',
    borderSubtle: '#d5c4a1',
    borderDefault: '#bdae93',
    borderStrong: '#a89984',
    textPrimary: '#3c3836',
    textSecondary: '#504945',
    textTertiary: '#7c6f64',
    textInverse: '#fbf1c7',
    accent: '#79740e',
    accentHover: '#98971a',
    accentSubtle: 'rgba(121, 116, 14, 0.15)',
    secondary: '#076678',
    error: '#cc241d',
    warning: '#d79921',
    success: '#79740e',
  }),

  // Dracula
  createTheme('dracula', 'Dracula', 'dark', {
    bgPrimary: '#282a36',
    bgSecondary: '#2d2f3d',
    bgTertiary: '#343746',
    bgElevated: '#2e303e',
    bgInset: '#21222c',
    borderSubtle: '#343746',
    borderDefault: '#44475a',
    borderStrong: '#6272a4',
    textPrimary: '#f8f8f2',
    textSecondary: '#c0c0d0',
    textTertiary: '#6272a4',
    textInverse: '#282a36',
    accent: '#50fa7b',
    accentHover: '#69ff94',
    accentSubtle: 'rgba(80, 250, 123, 0.15)',
    secondary: '#bd93f9',
    error: '#ff5555',
    warning: '#f1fa8c',
    success: '#50fa7b',
  }),

  // Nord Dark
  createTheme('nord-dark', 'Nord Dark', 'dark', {
    bgPrimary: '#2e3440',
    bgSecondary: '#3b4252',
    bgTertiary: '#434c5e',
    bgElevated: '#353b49',
    bgInset: '#272c36',
    borderSubtle: '#3b4252',
    borderDefault: '#434c5e',
    borderStrong: '#4c566a',
    textPrimary: '#eceff4',
    textSecondary: '#d8dee9',
    textTertiary: '#7b88a1',
    textInverse: '#2e3440',
    accent: '#a3be8c',
    accentHover: '#b4d09c',
    accentSubtle: 'rgba(163, 190, 140, 0.15)',
    secondary: '#81a1c1',
    error: '#bf616a',
    warning: '#ebcb8b',
    success: '#a3be8c',
  }),

  // Nord Light
  createTheme('nord-light', 'Nord Light', 'light', {
    bgPrimary: '#eceff4',
    bgSecondary: '#e5e9f0',
    bgTertiary: '#d8dee9',
    bgElevated: '#f0f4fc',
    bgInset: '#c7cdd8',
    borderSubtle: '#d8dee9',
    borderDefault: '#c0c8d8',
    borderStrong: '#a0aabe',
    textPrimary: '#2e3440',
    textSecondary: '#3b4252',
    textTertiary: '#7b88a1',
    textInverse: '#eceff4',
    accent: '#689d6a',
    accentHover: '#7db87d',
    accentSubtle: 'rgba(104, 157, 106, 0.15)',
    secondary: '#5e81ac',
    error: '#bf616a',
    warning: '#d08770',
    success: '#689d6a',
  }),

  // Monokai
  createTheme('monokai', 'Monokai', 'dark', {
    bgPrimary: '#272822',
    bgSecondary: '#2d2e27',
    bgTertiary: '#3e3d32',
    bgElevated: '#2f302a',
    bgInset: '#1e1f1c',
    borderSubtle: '#3e3d32',
    borderDefault: '#49483e',
    borderStrong: '#75715e',
    textPrimary: '#f8f8f2',
    textSecondary: '#cfcfc2',
    textTertiary: '#75715e',
    textInverse: '#272822',
    accent: '#a6e22e',
    accentHover: '#b6f23e',
    accentSubtle: 'rgba(166, 226, 46, 0.15)',
    secondary: '#66d9ef',
    error: '#f92672',
    warning: '#e6db74',
    success: '#a6e22e',
  }),

  // Solarized Dark
  createTheme('solarized-dark', 'Solarized Dark', 'dark', {
    bgPrimary: '#002b36',
    bgSecondary: '#073642',
    bgTertiary: '#0a3d4a',
    bgElevated: '#05303c',
    bgInset: '#001f27',
    borderSubtle: '#073642',
    borderDefault: '#0d4a5a',
    borderStrong: '#2aa198',
    textPrimary: '#fdf6e3',
    textSecondary: '#eee8d5',
    textTertiary: '#657b83',
    textInverse: '#002b36',
    accent: '#859900',
    accentHover: '#98ad00',
    accentSubtle: 'rgba(133, 153, 0, 0.15)',
    secondary: '#268bd2',
    error: '#dc322f',
    warning: '#b58900',
    success: '#859900',
  }),

  // Solarized Light
  createTheme('solarized-light', 'Solarized Light', 'light', {
    bgPrimary: '#fdf6e3',
    bgSecondary: '#eee8d5',
    bgTertiary: '#e5ddc8',
    bgElevated: '#f5efdc',
    bgInset: '#ddd6c1',
    borderSubtle: '#eee8d5',
    borderDefault: '#d6d0bb',
    borderStrong: '#b0aa95',
    textPrimary: '#073642',
    textSecondary: '#586e75',
    textTertiary: '#93a1a1',
    textInverse: '#fdf6e3',
    accent: '#859900',
    accentHover: '#6d8000',
    accentSubtle: 'rgba(133, 153, 0, 0.15)',
    secondary: '#268bd2',
    error: '#dc322f',
    warning: '#b58900',
    success: '#859900',
  }),

  // Catppuccin Mocha (dark)
  createTheme('catppuccin-mocha', 'Catppuccin Mocha', 'dark', {
    bgPrimary: '#1e1e2e',
    bgSecondary: '#262637',
    bgTertiary: '#313244',
    bgElevated: '#242435',
    bgInset: '#181825',
    borderSubtle: '#313244',
    borderDefault: '#45475a',
    borderStrong: '#585b70',
    textPrimary: '#cdd6f4',
    textSecondary: '#bac2de',
    textTertiary: '#6c7086',
    textInverse: '#1e1e2e',
    accent: '#a6e3a1',
    accentHover: '#b7f0b2',
    accentSubtle: 'rgba(166, 227, 161, 0.15)',
    secondary: '#89b4fa',
    error: '#f38ba8',
    warning: '#f9e2af',
    success: '#a6e3a1',
  }),

  // Catppuccin Latte (light)
  createTheme('catppuccin-latte', 'Catppuccin Latte', 'light', {
    bgPrimary: '#eff1f5',
    bgSecondary: '#e6e9ef',
    bgTertiary: '#dce0e8',
    bgElevated: '#f4f5f8',
    bgInset: '#ccd0da',
    borderSubtle: '#dce0e8',
    borderDefault: '#bcc0cc',
    borderStrong: '#9ca0b0',
    textPrimary: '#4c4f69',
    textSecondary: '#5c5f77',
    textTertiary: '#8c8fa1',
    textInverse: '#eff1f5',
    accent: '#40a02b',
    accentHover: '#359020',
    accentSubtle: 'rgba(64, 160, 43, 0.15)',
    secondary: '#1e66f5',
    error: '#d20f39',
    warning: '#df8e1d',
    success: '#40a02b',
  }),

  // Tokyo Night
  createTheme('tokyo-night', 'Tokyo Night', 'dark', {
    bgPrimary: '#1a1b26',
    bgSecondary: '#1f2029',
    bgTertiary: '#292e42',
    bgElevated: '#1e1f2b',
    bgInset: '#16161e',
    borderSubtle: '#292e42',
    borderDefault: '#3b4261',
    borderStrong: '#545c7e',
    textPrimary: '#c0caf5',
    textSecondary: '#a9b1d6',
    textTertiary: '#565f89',
    textInverse: '#1a1b26',
    accent: '#9ece6a',
    accentHover: '#aede7a',
    accentSubtle: 'rgba(158, 206, 106, 0.15)',
    secondary: '#7aa2f7',
    error: '#f7768e',
    warning: '#e0af68',
    success: '#9ece6a',
  }),

  // One Dark
  createTheme('one-dark', 'One Dark', 'dark', {
    bgPrimary: '#282c34',
    bgSecondary: '#2c313c',
    bgTertiary: '#353b45',
    bgElevated: '#2e333d',
    bgInset: '#21252b',
    borderSubtle: '#353b45',
    borderDefault: '#3e4451',
    borderStrong: '#5c6370',
    textPrimary: '#abb2bf',
    textSecondary: '#9da5b4',
    textTertiary: '#5c6370',
    textInverse: '#282c34',
    accent: '#98c379',
    accentHover: '#a8d389',
    accentSubtle: 'rgba(152, 195, 121, 0.15)',
    secondary: '#61afef',
    error: '#e06c75',
    warning: '#e5c07b',
    success: '#98c379',
  }),

  // GitHub Dark
  createTheme('github-dark', 'GitHub Dark', 'dark', {
    bgPrimary: '#0d1117',
    bgSecondary: '#161b22',
    bgTertiary: '#21262d',
    bgElevated: '#141920',
    bgInset: '#090c10',
    borderSubtle: '#21262d',
    borderDefault: '#30363d',
    borderStrong: '#484f58',
    textPrimary: '#f0f6fc',
    textSecondary: '#c9d1d9',
    textTertiary: '#6e7681',
    textInverse: '#0d1117',
    accent: '#3fb950',
    accentHover: '#56d364',
    accentSubtle: 'rgba(63, 185, 80, 0.15)',
    secondary: '#58a6ff',
    error: '#f85149',
    warning: '#d29922',
    success: '#3fb950',
  }),

  // GitHub Light
  createTheme('github-light', 'GitHub Light', 'light', {
    bgPrimary: '#ffffff',
    bgSecondary: '#f6f8fa',
    bgTertiary: '#ebeef1',
    bgElevated: '#ffffff',
    bgInset: '#dae0e7',
    borderSubtle: '#d8dee4',
    borderDefault: '#d0d7de',
    borderStrong: '#afb8c1',
    textPrimary: '#1f2328',
    textSecondary: '#59636e',
    textTertiary: '#8b949e',
    textInverse: '#ffffff',
    accent: '#1a7f37',
    accentHover: '#116329',
    accentSubtle: 'rgba(26, 127, 55, 0.15)',
    secondary: '#0969da',
    error: '#d1242f',
    warning: '#9a6700',
    success: '#1a7f37',
  }),
];

/**
 * Get a theme by its ID.
 */
export function getThemeById(id: ThemeId): ThemeDefinition | undefined {
  return themes.find((theme) => theme.id === id);
}

/**
 * Get all themes of a specific mode.
 */
export function getThemesByMode(mode: ThemeMode): ThemeDefinition[] {
  return themes.filter((theme) => theme.mode === mode);
}

/**
 * Get the default theme for a given mode.
 */
export function getDefaultTheme(mode: ThemeMode): ThemeDefinition {
  const defaultId: ThemeId = mode === 'dark' ? 'default-dark' : 'default-light';
  return themes.find((theme) => theme.id === defaultId) || themes[0];
}
