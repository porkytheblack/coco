'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

type IconButtonVariant = 'default' | 'primary' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  icon: ReactNode;
  label: string;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: 'text-coco-text-secondary hover:text-coco-text-primary',
  primary: 'text-coco-accent hover:text-coco-accent-hover',
  danger: 'text-coco-error hover:text-red-700',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'default', icon, label, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={clsx(
          'w-9 h-9 flex items-center justify-center rounded-md',
          'bg-transparent hover:bg-coco-bg-tertiary',
          'transition-all duration-base',
          'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
