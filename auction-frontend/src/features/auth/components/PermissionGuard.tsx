'use client';

import * as React from 'react';
import { useAuthStore, UserRole } from '../store/authStore';

interface PermissionGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ allowedRoles, children, fallback = null }: PermissionGuardProps) {
  const { status, user } = useAuthStore();

  if (status === 'UNKNOWN' || status === 'LOADING') {
    return null; // Or a minimal skeleton
  }

  if (status !== 'AUTHENTICATED' || !user) {
    return fallback;
  }

  const hasRole = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    return fallback;
  }

  return <>{children}</>;
}
