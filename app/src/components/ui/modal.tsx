'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { IconButton } from './icon-button';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
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
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={clsx(
          'relative w-full mx-4 bg-coco-bg-elevated rounded-xl shadow-lg',
          'animate-scale-in',
          sizeStyles[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-coco-border-subtle">
          <h2 id="modal-title" className="text-lg font-semibold text-coco-text-primary">
            {title}
          </h2>
          <IconButton
            icon={<X className="w-5 h-5" />}
            label="Close modal"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-coco-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
