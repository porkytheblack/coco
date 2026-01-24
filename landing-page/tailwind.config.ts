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
        sans: ['Sora', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
