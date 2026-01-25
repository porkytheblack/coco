'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { RouterProvider } from '@/contexts';
import { ToastContainer } from '@/components/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider>
        {children}
        <ToastContainer />
      </RouterProvider>
    </QueryClientProvider>
  );
}
