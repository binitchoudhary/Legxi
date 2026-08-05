'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuthStore();

  React.useEffect(() => {
    if (status === 'UNAUTHENTICATED' || status === 'SESSION_EXPIRED') {
      if (pathname && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
        const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
        router.replace(redirectUrl);
      }
    }
  }, [status, pathname, router]);

  if (status === 'INITIALIZING') {
    return <>{fallback}</>;
  }

  if (status !== 'AUTHENTICATED') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
