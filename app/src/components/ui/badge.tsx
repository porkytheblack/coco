'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'wallet' | 'contract' | 'success' | 'error' | 'pending' | 'cancelled';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  wallet: 'bg-coco-accent-subtle text-coco-accent',
  contract: 'bg-coco-bg-tertiary text-coco-text-secondary',
  success: 'bg-coco-success-subtle text-coco-success',
  error: 'bg-coco-error-subtle text-coco-error',
  pending: 'bg-coco-pending-subtle text-coco-pending',
  cancelled: 'border border-coco-border-default text-coco-text-tertiary bg-transparent',
};

const dotStyles: Record<BadgeVariant, string> = {
  wallet: 'bg-coco-accent',
  contract: 'bg-coco-text-secondary',
  success: 'bg-coco-success',
  error: 'bg-coco-error',
  pending: 'bg-coco-pending',
  cancelled: 'bg-coco-text-tertiary',
};

export function Badge({ variant = 'contract', children, showDot = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full',
        variantStyles[variant],
        className
      )}
    >
      {showDot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
}
