'use client';

import * as React from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Loader2 } from 'lucide-react';

export { useAuthStore as useAuth } from '@/features/auth/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeSession = useAuthStore((state) => state.initializeSession);
  const status = useAuthStore((state) => state.status);

  React.useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Prevent flash of unauthenticated or protected content while determining auth status
  if (status === 'INITIALIZING') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] text-white">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(212,175,55,0.2)] animate-pulse">
            <span className="font-serif text-2xl font-bold tracking-tighter text-primary">L</span>
          </div>
          <div className="flex items-center gap-3 text-sm tracking-widest uppercase text-white/70 font-light">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Establishing Secure Session</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
