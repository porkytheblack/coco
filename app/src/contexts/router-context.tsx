'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { parseRoute, buildPath, type RouteParams } from '@/lib/router';

interface RouterContextValue {
  route: RouteParams;
  navigate: (params: RouteParams) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

interface RouterProviderProps {
  children: ReactNode;
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [route, setRoute] = useState<RouteParams>({ view: 'chains' });

  // Parse initial route from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialRoute = parseRoute(window.location.pathname);
      setRoute(initialRoute);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newRoute = parseRoute(window.location.pathname);
      setRoute(newRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((params: RouteParams) => {
    const path = buildPath(params);
    window.history.pushState(null, '', path);
    setRoute(params);
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
