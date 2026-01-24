'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-coco-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-3 py-2 text-sm bg-coco-bg-primary border rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-coco-accent focus:border-transparent',
            'placeholder:text-coco-text-tertiary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-coco-error' : 'border-coco-border-default',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-coco-error">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-coco-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
