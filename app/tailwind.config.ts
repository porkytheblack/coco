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
          // Light Mode
          'bg-primary': 'var(--coco-bg-primary)',
          'bg-secondary': 'var(--coco-bg-secondary)',
          'bg-tertiary': 'var(--coco-bg-tertiary)',
          'bg-elevated': 'var(--coco-bg-elevated)',
          'border-subtle': 'var(--coco-border-subtle)',
          'border-default': 'var(--coco-border-default)',
          'border-strong': 'var(--coco-border-strong)',
          'text-primary': 'var(--coco-text-primary)',
          'text-secondary': 'var(--coco-text-secondary)',
          'text-tertiary': 'var(--coco-text-tertiary)',
          'text-inverse': 'var(--coco-text-inverse)',
          accent: 'var(--coco-accent)',
          'accent-hover': 'var(--coco-accent-hover)',
          'accent-subtle': 'var(--coco-accent-subtle)',
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
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
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
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        drawer: '-4px 0 24px rgba(0, 0, 0, 0.12)',
      },
      transitionDuration: {
        fast: '100ms',
        base: '150ms',
        slow: '300ms',
      },
      animation: {
        'slide-in': 'slideIn 300ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        spin: 'spin 1s linear infinite',
        pulse: 'pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
