'use client';

import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore, type ToastType } from '@/stores/toast-store';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-coco-success" />,
  error: <XCircle className="w-5 h-5 text-coco-error" />,
  warning: <AlertCircle className="w-5 h-5 text-coco-warning" />,
  info: <Info className="w-5 h-5 text-coco-accent" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-coco-success/10 border-coco-success/20',
  error: 'bg-coco-error/10 border-coco-error/20',
  warning: 'bg-coco-warning/10 border-coco-warning/20',
  info: 'bg-coco-accent/10 border-coco-accent/20',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
            'bg-coco-bg-elevated',
            bgColors[toast.type],
            'animate-in slide-in-from-right-full duration-300'
          )}
        >
          <div className="flex-shrink-0">{icons[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-coco-text-primary">{toast.title}</p>
            {toast.message && (
              <p className="mt-1 text-xs text-coco-text-secondary">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 hover:bg-coco-bg-tertiary rounded transition-colors"
          >
            <X className="w-4 h-4 text-coco-text-tertiary" />
          </button>
        </div>
      ))}
    </div>
  );
}
