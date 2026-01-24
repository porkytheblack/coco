'use client';

import { clsx } from 'clsx';
import { Check, X, Loader2, Ban } from 'lucide-react';
import type { TxStatus } from '@/types';

type StatusType = TxStatus | 'running' | 'cancelled';

interface StatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const labelStyles: Record<StatusType, string> = {
  success: 'text-coco-success',
  failed: 'text-coco-error',
  running: 'text-coco-accent',
  pending: 'text-coco-pending',
  cancelled: 'text-coco-text-tertiary',
};

export function StatusIndicator({ status, size = 'md', showLabel = false }: StatusIndicatorProps) {
  const iconClass = sizeStyles[size];

  const renderIcon = () => {
    switch (status) {
      case 'success':
        return (
          <div className="flex items-center justify-center rounded-full bg-coco-success-subtle p-0.5">
            <Check className={clsx(iconClass, 'text-coco-success')} />
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center justify-center rounded-full bg-coco-error-subtle p-0.5">
            <X className={clsx(iconClass, 'text-coco-error')} />
          </div>
        );
      case 'running':
      case 'pending':
        return (
          <Loader2 className={clsx(iconClass, 'text-coco-accent animate-spin')} />
        );
      case 'cancelled':
        return (
          <div className="flex items-center justify-center rounded-full bg-coco-pending-subtle p-0.5">
            <Ban className={clsx(iconClass, 'text-coco-text-tertiary')} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {renderIcon()}
      {showLabel && (
        <span className={clsx('text-sm font-medium capitalize', labelStyles[status])}>
          {status}
        </span>
      )}
    </div>
  );
}
