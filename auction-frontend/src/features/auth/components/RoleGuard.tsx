'use client';

import * as React from 'react';
import { AuthGuard } from './AuthGuard';
import { AccessDenied } from './AccessDenied';
import { useAuthStore, UserRole } from '../store/authStore';
import { canAccess } from '../utils/authorization';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGuard enforces role-based client authorization.
 * Wraps AuthGuard to ensure session is authenticated first, then checks role requirements.
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback = <AccessDenied />,
}: RoleGuardProps) {
  const { user } = useAuthStore();

  return (
    <AuthGuard fallback={null}>
      {canAccess(user, allowedRoles) ? children : fallback}
    </AuthGuard>
  );
}
