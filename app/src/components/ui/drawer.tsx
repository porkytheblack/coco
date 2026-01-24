'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { IconButton } from './icon-button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ isOpen, onClose, title, children, footer }: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={clsx(
          'fixed right-0 top-0 bottom-0 w-1/2 min-w-[400px] max-w-[800px]',
          'bg-coco-bg-elevated border-l border-coco-border-subtle',
          'shadow-drawer z-50 flex flex-col',
          'animate-slide-in'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-coco-border-subtle">
          <h2 className="text-lg font-semibold text-coco-text-primary">{title}</h2>
          <IconButton
            icon={<X className="w-5 h-5" />}
            label="Close drawer"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-coco-border-subtle">{footer}</div>
        )}
      </div>
    </>
  );
}
