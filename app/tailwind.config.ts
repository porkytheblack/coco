import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        coco: {
          // Backgrounds
          'bg-primary': 'var(--coco-bg-primary)',
          'bg-secondary': 'var(--coco-bg-secondary)',
          'bg-tertiary': 'var(--coco-bg-tertiary)',
          'bg-elevated': 'var(--coco-bg-elevated)',
          'bg-inset': 'var(--coco-bg-inset)',
          // Borders
          'border-subtle': 'var(--coco-border-subtle)',
          'border-default': 'var(--coco-border-default)',
          'border-strong': 'var(--coco-border-strong)',
          // Text
          'text-primary': 'var(--coco-text-primary)',
          'text-secondary': 'var(--coco-text-secondary)',
          'text-tertiary': 'var(--coco-text-tertiary)',
          'text-inverse': 'var(--coco-text-inverse)',
          // Primary accent (green)
          accent: 'var(--coco-accent)',
          'accent-hover': 'var(--coco-accent-hover)',
          'accent-subtle': 'var(--coco-accent-subtle)',
          // Secondary accent (blue/cyan)
          secondary: 'var(--coco-secondary)',
          'secondary-hover': 'var(--coco-secondary-hover)',
          'secondary-subtle': 'var(--coco-secondary-subtle)',
          // Status colors
          success: 'var(--coco-success)',
          'success-subtle': 'var(--coco-success-subtle)',
          error: 'var(--coco-error)',
          'error-subtle': 'var(--coco-error-subtle)',
          warning: 'var(--coco-warning)',
          'warning-subtle': 'var(--coco-warning-subtle)',
          pending: 'var(--coco-pending)',
          'pending-subtle': 'var(--coco-pending-subtle)',
        },
      },
      fontFamily: {
        sans: ['Sora', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        sm: 'var(--coco-shadow-sm)',
        md: 'var(--coco-shadow-md)',
        lg: 'var(--coco-shadow-lg)',
        drawer: 'var(--coco-shadow-drawer)',
        glow: 'var(--coco-shadow-glow)',
      },
      transitionDuration: {
        fast: '100ms',
        base: '150ms',
        slow: '300ms',
      },
      animation: {
        'slide-in': 'slideIn 300ms ease-out',
        'slide-in-left': 'slideInLeft 300ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        spin: 'spin 1s linear infinite',
        pulse: 'pulse 1.5s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backgroundImage: {
        'gradient-accent': 'var(--coco-gradient-accent)',
        'gradient-bg': 'var(--coco-gradient-bg)',
      },
    },
  },
  plugins: [],
};

export default config;
