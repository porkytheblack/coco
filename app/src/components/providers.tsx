'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { RouterProvider } from '@/contexts';
import { ToastContainer, CommandPalette, UpdateNotification } from '@/components/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider>
        {children}
        <ToastContainer />
        <CommandPalette />
        <UpdateNotification />
      </RouterProvider>
    </QueryClientProvider>
  );
}
