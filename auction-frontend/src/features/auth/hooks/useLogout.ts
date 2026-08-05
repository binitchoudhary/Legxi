'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export function useLogout() {
  const router = useRouter();
  const logoutAction = useAuthStore((state) => state.logout);

  const logout = React.useCallback(async () => {
    // 1. Trigger domain logout action (POST /api/auth/logout & clear auth store)
    await logoutAction();

    // 2. Redirect to login
    router.replace('/login');
  }, [logoutAction, router]);

  return { logout };
}
