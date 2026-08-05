'use client';

import * as React from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

export { useAuthStore as useAuth } from '@/features/auth/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((state) => state.initAuth);
  const status = useAuthStore((state) => state.status);

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Don't render until we know the initial auth status
  if (status === 'UNKNOWN' || status === 'LOADING') {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center">Loading session...</div>;
  }

  return (
    <>
      {children}
    </>
  );
}
